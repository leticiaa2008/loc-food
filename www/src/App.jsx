import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from './services/supabase';
import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import './App.css';

export default function App() {
  const [cupons, setCupons] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('info');
  const [localizacao, setLocalizacao] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [statusLocalizacao, setStatusLocalizacao] = useState('');
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);

  async function buscarLocalizacao() {
    setBuscandoLocalizacao(true);
    setStatusLocalizacao('');

    try {
      const permission = await Geolocation.requestPermissions();

      if (permission.location !== 'granted') {
        throw new Error('Permissão de localização negada pelo sistema operacional.');
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      setLocalizacao({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      setStatusLocalizacao(
        `Coordenadas capturadas com sucesso. Precisão: ${Number(
          position.coords.accuracy
        ).toFixed(1)} m.`
      );
    } catch (erro) {
      const mensagemErro =
        erro?.message || 'Não foi possível obter a localização do dispositivo.';

      setStatusLocalizacao(mensagemErro);
      setLocalizacao({ latitude: null, longitude: null, accuracy: null });
    } finally {
      setBuscandoLocalizacao(false);
    }
  }

  const googleMapsUrl =
    localizacao.latitude !== null && localizacao.longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${localizacao.latitude},${localizacao.longitude}`
      : '';

  async function adicionarCupom(origem) {
    if (carregando) return;

    setCarregando(true);
    setMensagem('');

    try {
      if (!supabase) {
        throw new Error(
          'Configuração do Supabase não encontrada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.'
        );
      }

      const imagem = await Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.Uri,
        source: origem,
        allowEditing: false,
        promptLabelHeader: 'Anexar comprovante',
        promptLabelPhoto: 'Escolher da galeria',
        promptLabelPicture: 'Tirar fotografia',
        saveToGallery: false,
      });

      if (!imagem?.webPath) {
        throw new Error('Não foi possível carregar a imagem.');
      }

      setMensagem('Enviando foto para a nuvem...');
      setTipoMensagem('info');

      const resposta = await fetch(imagem.webPath);
      if (!resposta.ok) {
        throw new Error('Não foi possível ler a imagem capturada.');
      }

      const blob = await resposta.blob();

      const nomeArquivo = `cupom-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;

      const { data, error } = await supabase.storage
        .from('fotos-camera')
        .upload(nomeArquivo, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('fotos-camera')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      setCupons((anteriores) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          webPath: publicUrl,
          publicUrl,
          caminhoStorage: data.path,
          data: new Date().toLocaleString('pt-BR'),
          origem:
            origem === CameraSource.Camera
              ? 'Capturado pela câmera'
              : 'Selecionado da galeria',
        },
        ...anteriores,
      ]);

      setMensagem('Foto enviada e salva na nuvem com sucesso!');
      setTipoMensagem('sucesso');
    } catch (erro) {
      console.error('Erro ao capturar ou enviar foto:', erro);

      setMensagem(
        erro?.message || 'Não foi possível enviar a foto. Tente novamente.'
      );
      setTipoMensagem('erro');
    } finally {
      setCarregando(false);
    }
  }

  function removerCupom(id) {
    setCupons((anteriores) =>
      anteriores.filter((cupom) => cupom.id !== id)
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio">
          <span className="brand-symbol">FT<span>✳</span></span>
          <span className="brand-name">
            FOOD TRUCK
            <strong>FISCAL<span>.</span></strong>
          </span>
        </a>

        <div className="topbar-label">
          <span className="live-dot" />
          <span>GESTÃO DO NEGÓCIO</span>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            SEU NEGÓCIO, BEM ORGANIZADO
          </div>

          <h1>
            Cada venda
            <br />
            tem sua <span>história.</span>
          </h1>

          <p className="hero-description">
            Guarde seus comprovantes fiscais, organize os registros
            e deixe a papelada em dia. Tudo em um só lugar.
          </p>

          <a href="#registro" className="primary-link">
            Organizar meus cupons <span>↘</span>
          </a>

          <div className="hero-proof">
            <span className="proof-icon">✓</span>
            <span>Prático, simples e feito para o seu dia a dia.</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-sun" />
          <span className="visual-spark spark-a">✳</span>
          <span className="visual-spark spark-b">✦</span>
          <span className="visual-caption">FEITO COM CAPRICHO</span>

          <div className="illustration">
            <div className="truck-awning">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="truck-sign">FRESH FOOD</div>
            <div className="truck-body">
              <div className="truck-window">
                <div className="window-top">
                  <span>GOOD</span>
                  <span>FOOD</span>
                </div>
                <div className="window-counter" />
                <span className="burger-art">🍔</span>
              </div>
              <div className="truck-front">
                <span className="front-number">01</span>
                <span className="front-line" />
                <span className="front-light" />
              </div>
            </div>
            <div className="truck-bumper" />
            <div className="truck-wheel wheel-left">
              <span />
            </div>
            <div className="truck-wheel wheel-right">
              <span />
            </div>
          </div>

          <div className="floating-receipt">
            <div className="floating-receipt-top">
              <span>RECIBO</span>
              <span>✓</span>
            </div>
            <div className="receipt-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
            <strong>R$ --,--</strong>
            <small>COMPROVANTE</small>
          </div>

          <div className="visual-sticker">
            <span>✦</span> CONTAS EM DIA!
          </div>
        </div>
      </section>

      <section className="gps-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">GPS · LOCALIZAÇÃO</div>
            <h2>Coordenadas em tempo real</h2>
            <p>Capturamos a latitude, longitude e precisão do GPS do seu celular.</p>
          </div>
          <div className="heading-decoration">⌖</div>
        </div>

        <div className="gps-card">
          <div className="gps-grid">
            <div className="gps-item">
              <span>Latitude</span>
              <strong>
                {localizacao.latitude !== null ? localizacao.latitude.toFixed(6) : '--'}
              </strong>
            </div>
            <div className="gps-item">
              <span>Longitude</span>
              <strong>
                {localizacao.longitude !== null ? localizacao.longitude.toFixed(6) : '--'}
              </strong>
            </div>
            <div className="gps-item">
              <span>Precisão</span>
              <strong>
                {localizacao.accuracy !== null
                  ? `${localizacao.accuracy.toFixed(1)} m`
                  : '--'}
              </strong>
            </div>
          </div>

          <div className="gps-actions">
            <button
              type="button"
              className="primary-button"
              onClick={buscarLocalizacao}
              disabled={buscandoLocalizacao}
            >
              {buscandoLocalizacao ? 'Buscando GPS...' : 'Buscar localização'}
            </button>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                Abrir no Google Maps
              </a>
            )}
          </div>
        </div>

        {statusLocalizacao && (
          <div
            className={`feedback ${
              statusLocalizacao.toLowerCase().includes('erro') ||
              statusLocalizacao.toLowerCase().includes('negada')
                ? 'feedback-erro'
                : 'feedback-sucesso'
            }`}
            role="status"
            aria-live="polite"
          >
            <span className="feedback-icon">
              {statusLocalizacao.toLowerCase().includes('erro') ||
              statusLocalizacao.toLowerCase().includes('negada')
                ? '!'
                : '✓'}
            </span>
            <span>{statusLocalizacao}</span>
          </div>
        )}
      </section>

      <section className="dashboard-strip">
        <div className="dashboard-intro">
          <span className="dashboard-icon">▤</span>
          <div>
            <strong>Seu controle de comprovantes</strong>
            <span>Acompanhe os registros desta sessão.</span>
          </div>
        </div>

        <div className="dashboard-metric">
          <span>REGISTROS NA TELA</span>
          <strong>{String(cupons.length).padStart(2, '0')}</strong>
        </div>

        <div className="dashboard-metric">
          <span>QUALIDADE DA FOTO</span>
          <strong>70<span className="percent">%</span></strong>
        </div>
      </section>

      <section className="register-section" id="registro">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 — NOVO REGISTRO</div>
            <h2>Vamos guardar esse cupom?</h2>
            <p>Escolha como deseja anexar seu comprovante fiscal.</p>
          </div>
          <div className="heading-decoration">✳</div>
        </div>

        <div className="action-grid">
          <button
            className="action-card camera-action"
            onClick={() => adicionarCupom(CameraSource.Camera)}
            disabled={carregando}
            type="button"
          >
            <span className="action-icon">📸</span>
            <span className="action-content">
              <span className="action-kicker">OPÇÃO 01</span>
              <strong>{carregando ? 'Aguarde...' : 'Fotografar cupom'}</strong>
              <small>Abra a câmera e registre a nota impressa.</small>
            </span>
            <span className="action-arrow">↗</span>
          </button>

          <button
            className="action-card gallery-action"
            onClick={() => adicionarCupom(CameraSource.Photos)}
            disabled={carregando}
            type="button"
          >
            <span className="action-icon">🧾</span>
            <span className="action-content">
              <span className="action-kicker">OPÇÃO 02</span>
              <strong>Escolher da galeria</strong>
              <small>Adicione uma imagem que já está no celular.</small>
            </span>
            <span className="action-arrow">↗</span>
          </button>
        </div>

        {mensagem && (
          <div
            className={`feedback feedback-${tipoMensagem}`}
            role="status"
            aria-live="polite"
          >
            <span className="feedback-icon">
              {tipoMensagem === 'sucesso'
                ? '✓'
                : tipoMensagem === 'erro'
                  ? '!'
                  : 'i'}
            </span>
            <span>{mensagem}</span>
            <button
              type="button"
              aria-label="Fechar mensagem"
              onClick={() => setMensagem('')}
            >
              ×
            </button>
          </div>
        )}
      </section>

      <section className="receipts-section">
        <div className="receipts-heading">
          <div>
            <div className="eyebrow">02 — SEU ARQUIVO</div>
            <h2>Comprovantes <span>registrados.</span></h2>
          </div>
          <div className="receipt-counter">
            <strong>{cupons.length}</strong>
            <span>{cupons.length === 1 ? 'CUPOM' : 'CUPONS'}</span>
          </div>
        </div>

        {cupons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">
              <div className="empty-paper">
                <span />
                <span />
                <span />
                <span />
                <strong>R$ --,--</strong>
              </div>
              <span className="empty-plus">+</span>
            </div>
            <h3>Seu arquivo começa aqui.</h3>
            <p>
              Ainda não há comprovantes nesta sessão. Fotografe
              seu primeiro cupom e ele aparecerá aqui.
            </p>
            <a href="#registro">Adicionar meu primeiro cupom ↑</a>
          </div>
        ) : (
          <div className="receipts-grid">
            {cupons.map((cupom, index) => (
              <article className="receipt-card" key={cupom.id}>
                <div className="receipt-card-top">
                  <span className="receipt-number">
                    COMPROVANTE Nº {String(cupons.length - index).padStart(3, '0')}
                  </span>
                  <span className="receipt-verified">✓ REGISTRADO</span>
                </div>

                <div className="receipt-image-wrap">
                  <img
                    src={cupom.webPath}
                    alt={`Cupom fiscal ${cupons.length - index}`}
                    className="receipt-image"
                  />
                </div>

                <div className="receipt-card-info">
                  <span className="receipt-category">DOCUMENTO FISCAL</span>
                  <h3>Cupom de compra</h3>
                  <p>{cupom.data}</p>
                  <span className="receipt-origin">{cupom.origem}</span>
                </div>

                <button
                  className="remove-button"
                  type="button"
                  onClick={() => removerCupom(cupom.id)}
                >
                  Remover da tela <span>×</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="#inicio">
          <span className="brand-symbol">FT<span>✳</span></span>
          <span className="brand-name">
            FOOD TRUCK
            <strong>FISCAL<span>.</span></strong>
          </span>
        </a>
        <p>Organização nos registros. Mais tranquilidade no negócio.</p>
        <span className="footer-course">PROJETO ACADÊMICO · PPDM2</span>
      </footer>
    </main>
  );
}
