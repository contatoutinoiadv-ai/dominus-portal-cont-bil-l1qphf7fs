/**
 * Configurações institucionais do DOMINUS PORTAL
 * Centraliza parâmetros de contato e suporte para o cliente final.
 */

export const PORTAL_CONFIG = {
  nome: 'DOMINUS PORTAL',
  tagline: 'Inteligência e Gestão Fiscal de Alto Padrão',
  // Número oficial de WhatsApp do escritório para "Falar com meu contador" (formato internacional sem + ou espaços)
  whatsappNumero: '5511999998888',
  whatsappMensagemPadrao:
    'Olá! Sou cliente do Dominus Portal e gostaria de tirar uma dúvida sobre a apuração fiscal da minha empresa.',
  linkWhatsAppContador: (mensagem?: string) => {
    const texto = encodeURIComponent(mensagem || PORTAL_CONFIG.whatsappMensagemPadrao)
    return `https://wa.me/${PORTAL_CONFIG.whatsappNumero}?text=${texto}`
  },
  versao: '2025.1 Premium',
}
