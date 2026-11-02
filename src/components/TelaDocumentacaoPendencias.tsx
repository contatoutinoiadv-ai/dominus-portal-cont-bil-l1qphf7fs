import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Info,
  Mail,
  Globe,
  Sliders,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react'

export const TelaDocumentacaoPendencias: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-mono tracking-widest text-primary font-bold uppercase">
          Guia de Implantação e Transparência
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
          Configurações, Homologações e Pendências do Usuário
        </h2>
        <p className="text-xs text-muted-foreground">
          Relatório explícito sobre o que está ativo no banco Skip Cloud e o que depende de
          parametrização externa.
        </p>
      </div>

      {/* Grid de Blocos Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bloco 1: Envio de E-mails / SMTP */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                1. Envio de E-mails Transacionais (SMTP)
              </CardTitle>
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px]">
                Depende de Configuração
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Disparos de lembretes nos dias 1, 3 e 5 e redefinição de senha por e-mail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              O sistema possui os fluxos de recuperação de senha e notificações em tempo real
              totalmente implementados na interface e no banco de dados.
            </p>
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">
                Para ativar o envio real de e-mails para a caixa de entrada:
              </strong>
              <p>
                • Acessar o painel do PocketBase em <em>Settings &gt; Mail settings</em>.
              </p>
              <p>
                • Configurar o host SMTP do escritório (ex: Amazon SES, Resend, Sendgrid ou Google
                Workspace).
              </p>
              <p>
                • <strong>Plano de contingência ativo:</strong> Sempre que um usuário solicita
                recuperação de senha, o sistema grava uma notificação prioritária no painel do
                contador chefe para suporte imediato.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2: Domínio Próprio e Certificado TLS */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                2. Domínio e Publicação
              </CardTitle>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Backend Conectado
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Acesso web seguro com isolamento estrito por empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              A aplicação está conectada ao backend oficial do Skip Cloud em{' '}
              <code className="text-primary font-mono text-[11px]">
                https://dominus-portal-contabil-f75c1.shrd01.internal.goskip.dev
              </code>
              .
            </p>
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">Publicação em Domínio Próprio:</strong>
              <p>
                • No painel da Skip, você pode conectar seu domínio customizado (ex:{' '}
                <code>portal.dominuscontabil.com.br</code>).
              </p>
              <p>• O certificado SSL/TLS é emitido automaticamente com renovação gerenciada.</p>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 3: Parâmetros Fiscais e Tabelas a Conferir */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                3. Parâmetros Fiscais a Conferir
              </CardTitle>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Pré-carregado no Banco
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Valores vigentes da legislação 2025 pré-inseridos na coleção{' '}
              <code>parametros_fiscais</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              Nenhuma alíquota está fixa em código rígido: tudo é lido e gravado nas tabelas do
              banco com vigência temporal.
            </p>
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">
                Tabelas pré-carregadas e disponíveis para edição:
              </strong>
              <p>
                • <strong>Simples Nacional:</strong> Anexos I a V da LC 123/2006, teto de R$ 4,8M e
                sublimite de R$ 3,6M.
              </p>
              <p>
                • <strong>MEI:</strong> INSS R$ 70,60 (5% SM), ICMS R$ 1,00, ISS R$ 5,00 e limite de
                R$ 81.000,00.
              </p>
              <p>
                • <strong>Lucro Presumido:</strong> IRPJ 15% + adicional de 10% (&gt; R$
                60k/trimestre), CSLL 9%, PIS 0,65% e COFINS 3%.
              </p>
              <p>
                • <strong>Reforma Tributária (CBS/IBS/IS):</strong> Estrutura criada e desligada por
                padrão, ativável a qualquer momento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 4: Contas de Demonstração e Segurança */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                4. Contas de Acesso e Isolamento LGPD
              </CardTitle>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Ativo e Homologado
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Regras no servidor garantindo que um cliente nunca veja dados de outro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <div className="space-y-1 font-mono text-[11px]">
              <p>
                • <strong>Contador:</strong> <code>contatoutinoiadv@gmail.com</code> (Senha:{' '}
                <code>Skip@Pass</code>)
              </p>
              <p>
                • <strong>Cliente Simples:</strong> <code>cliente.simples@dominus.com.br</code>{' '}
                (Senha: <code>Skip@Pass</code>)
              </p>
              <p>
                • <strong>Cliente MEI:</strong> <code>cliente.mei@dominus.com.br</code> (Senha:{' '}
                <code>Skip@Pass</code>)
              </p>
              <p>
                • <strong>Cliente Presumido:</strong> <code>cliente.presumido@dominus.com.br</code>{' '}
                (Senha: <code>Skip@Pass</code>)
              </p>
            </div>
            <p className="text-[11px] pt-1 border-t border-border">
              Bloqueio automático por 5 minutos após 5 tentativas de senha incorretas, termo LGPD no
              primeiro acesso e log de auditoria permanente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
