import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  QrCode,
  RefreshCw,
  Send,
  Share2,
  X,
} from 'lucide-react';

interface QrCodeCardProps {
  code: string;
  title: string;
  compact?: boolean;
  showProjectorLink?: boolean;
}

interface InviteInfoPayload {
  gameId: string;
  code: string;
  title: string;
  status: string;
  signature: string;
  hasPublicUrl: boolean;
  publicOrigin: string | null;
  publicUrlReason: string;
  detectedHost: string;
  inviteUrl: string | null;
  projectorUrl: string;
}

export function getProjectorUrl(code: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?projector=${encodeURIComponent(code)}`;
}

function isClientSideValidPublicInviteUrl(urlStr: string | null): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (
      !host ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('ais-dev-') ||
      host === 'aistudio.google.com' ||
      host.endsWith('.aistudio.google.com')
    ) {
      return false;
    }
    return parsed.pathname.includes('/partida/');
  } catch {
    return false;
  }
}

export function QrCodeCard({
  code,
  title,
  compact = false,
  showProjectorLink = true,
}: QrCodeCardProps) {
  const [inviteInfo, setInviteInfo] = useState<InviteInfoPayload | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'code' | 'link' | 'share' | null>(
    null
  );
  const [showQrModal, setShowQrModal] = useState(false);

  const loadInviteInfo = useCallback(
    async (refresh = false) => {
      if (!code) {
        setInfoError('La partida no tiene un código válido.');
        setLoadingInfo(false);
        return;
      }
      setLoadingInfo(true);
      setInfoError(null);
      try {
        const params = new URLSearchParams();
        if (typeof window !== 'undefined' && window.location.origin) {
          params.set('origin', window.location.origin);
        }
        if (refresh) {
          params.set('refresh', '1');
        }
        const res = await fetch(
          `/api/games/${encodeURIComponent(code)}/invite-info?${params.toString()}`
        );
        const data = await res.json();
        if (!res.ok) {
          setInviteInfo(null);
          setInfoError(
            data.error || 'No se pudo obtener la invitación de la partida.'
          );
        } else {
          setInviteInfo(data);
        }
      } catch {
        setInviteInfo(null);
        setInfoError('Error de conexión al verificar el dominio público.');
      } finally {
        setLoadingInfo(false);
      }
    },
    [code]
  );

  useEffect(() => {
    loadInviteInfo(false);
  }, [loadInviteInfo]);

  const validInviteUrl =
    inviteInfo &&
    inviteInfo.hasPublicUrl &&
    inviteInfo.gameId &&
    isClientSideValidPublicInviteUrl(inviteInfo.inviteUrl)
      ? inviteInfo.inviteUrl!
      : '';

  const projectorUrl = inviteInfo?.projectorUrl || getProjectorUrl(code);

  // Single source of truth: QR encodes strictly the verified production inviteUrl
  useEffect(() => {
    if (!validInviteUrl) {
      setQrDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(validInviteUrl, {
      width: 512,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [validInviteUrl]);

  const copyText = async (
    text: string,
    type: 'code' | 'link' | 'share'
  ) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2200);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !validInviteUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-DimeTuQueDices-${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNativeShare = async () => {
    if (!validInviteUrl) return;
    const shareData = {
      title: `${title} — Dime Tú Qué Dices`,
      text: `¡Únete en vivo al concurso bíblico "${title}"! Código: ${code}`,
      url: validInviteUrl,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share unsupported; fall back to copy
      }
    }
    await copyText(validInviteUrl, 'share');
  };

  const whatsappText = validInviteUrl
    ? encodeURIComponent(
        `¡Únete al concurso bíblico "${title}" en DIME TÚ QUÉ DICES!\nIngresa directo como invitado en este enlace:\n${validInviteUrl}`
      )
    : '';
  const whatsappUrl = validInviteUrl ? `https://wa.me/?text=${whatsappText}` : '';

  const getDisabledMessage = (reason?: string): string => {
    if (reason === 'AI_STUDIO_PRIVATE_PREVIEW') {
      return 'La aplicación está en la vista previa privada de Google AI Studio. Ese dominio exige cuenta de Google del propietario y genera Error 403 en celulares de invitados.';
    }
    if (reason === 'AUTH_REQUIRED') {
      return 'El dominio actual exige autenticación externa antes de cargar la aplicación, por lo que los invitados recibirían Error 403 al escanear el QR.';
    }
    if (reason === 'UNREACHABLE_OR_NOT_DEPLOYED') {
      return 'El dominio actual aún no responde públicamente sin inicio de sesión. Verifica que el despliegue en producción esté publicado con acceso público.';
    }
    return 'La aplicación se está ejecutando en un entorno local (localhost). Los celulares externos no pueden acceder a direcciones locales.';
  };

  return (
    <>
      <div className="bg-[#111A2E] border border-slate-700/70 rounded-2xl p-5 flex flex-col gap-4">
        {loadingInfo ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Detectando y verificando dominio público de producción...
          </div>
        ) : infoError ? (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-sm">
            {infoError}
          </div>
        ) : !validInviteUrl ? (
          <div className="space-y-4">
            <div className="bg-amber-500/15 border border-amber-400/60 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start gap-2.5 text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-display font-bold text-sm sm:text-base text-white">
                    Código QR desactivado en vista previa privada
                  </p>
                  <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                    {getDisabledMessage(inviteInfo?.publicUrlReason)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-xl border border-dashed border-slate-700 bg-slate-900/70 flex flex-col items-center justify-center text-slate-500 shrink-0">
                <QrCode className="w-8 h-8 mb-1 opacity-50" />
                <span className="text-[11px] font-medium">Desactivado</span>
              </div>
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300 flex-1">
                <p className="font-semibold text-white">
                  Activación automática en producción
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Al abrir <strong>DIME TÚ QUÉ DICES</strong> desde su dominio
                  público publicado, el sistema lo detectará automáticamente y
                  activará el código QR directo para invitados sin pedir cuenta
                  ni configuración manual.
                </p>
                <button
                  type="button"
                  onClick={() => loadInviteInfo(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar detección
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>
                Código de sala:{' '}
                <strong className="font-mono-num text-amber-300 text-sm">
                  {code}
                </strong>
              </span>
              {showProjectorLink && (
                <a
                  href={projectorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Proyección
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-2.5 rounded-xl shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Código QR directo para unirse a la partida ${code}`}
                  className={compact ? 'w-32 h-32' : 'w-44 h-44'}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`${
                    compact ? 'w-32 h-32' : 'w-44 h-44'
                  } bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs`}
                >
                  Generando QR...
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Código de la partida
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono-num text-2xl sm:text-3xl font-bold tracking-wider text-amber-400">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(code, 'code')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedType === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Enlace público de invitado para participantes
                </p>
                <div className="mt-1 flex items-center gap-2 bg-[#080E1E] border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-300 truncate flex-1 font-mono">
                    {validInviteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(validInviteUrl, 'link')}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedType === 'link' ? 'Copiado' : 'Copiar enlace'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={!qrDataUrl}
                  onClick={() => setShowQrModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Mostrar código QR
                </button>

                <button
                  type="button"
                  disabled={!qrDataUrl}
                  onClick={handleDownloadQr}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar QR
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp
                </a>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copiedType === 'share' ? 'Enlace copiado' : 'Otras apps'}
                </button>

                {showProjectorLink && (
                  <a
                    href={projectorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pantalla de Proyección
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded QR Modal for clear scanning */}
      {showQrModal && qrDataUrl && validInviteUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[#111A2E] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300">
                Escanea con tu cámara
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                aria-label="Cerrar código QR"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-xl text-white">
                {title}
              </h3>
              <p className="font-mono-num text-2xl font-bold text-amber-400">
                {code}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
              <img
                src={qrDataUrl}
                alt={`Código QR ampliado de la partida ${code}`}
                className="w-64 h-64 sm:w-72 sm:h-72"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-xs text-slate-400 break-all font-mono">
              {validInviteUrl}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Descargar PNG
              </button>
              <button
                type="button"
                onClick={() => copyText(validInviteUrl, 'link')}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                {copiedType === 'link' ? '¡Enlace copiado!' : 'Copiar enlace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
