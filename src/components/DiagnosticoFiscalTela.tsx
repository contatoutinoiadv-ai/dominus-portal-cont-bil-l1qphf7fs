import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Building,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  FileDown,
  LineChart,
  ShieldCheck,
  Percent,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { Empresa } from '@/types/dominus'
import {
  compararRegimesTributarios,
  ComparativoRegimesResultado,
  PARAMETROS_VIGENTES_PADRAO,
} from '@/lib/taxEngine'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts'

export const DiagnosticoFiscalTela: React.FC = () => {
  const { user, isContador, empresa: empresaCliente } = useAuth()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null)

  // Dados para o diagnóstico fiscal
  const [faturamentoSimulado, setFaturamentoSimulado] = useState<number>(60000)
  const [rbt12Simulado, setRbt12Simulado] = useState<number>(720000)
  const [folha12mSimulada, setFolha12mSimulada] = useState<number>(216000) // 30% Fator R
  const [reformaTributariaAtiva] = useState<boolean>(false)
  const [liberadoParaCliente, setLiberadoParaCliente] = useState<boolean>(true)
  const [percentualAlerta, setPercentualAlerta] = useState<number>(10)
  const [salvandoParametro, setSalvandoParametro] = useState<boolean>(false)

  const carregarEmpresas = useCallback(async () => {
    try {
      if (isContador) {
        const res = await pb.collection('empresas').getList(1, 100, {
          sort: 'razao_social',
          filter: "deleted_at = '' || deleted_at = null",
        })
        const itens = res.items as unknown as Empresa[]
        setEmpresas(itens)
        if (itens.length > 0 && !empresaSelecionada) {
          setEmpresaSelecionada(itens[0])
        }
      } else if (empresaCliente) {
        setEmpresas([empresaCliente])
        setEmpresaSelecionada(empresaCliente)
      }
    } catch (e) {
      console.warn('Erro ao carregar empresas para diagnóstico fiscal:', e)
    }
  }, [isContador, empresaCliente, empresaSelecionada])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  // Atualizar parâmetros simulados ao mudar de empresa
  useEffect(() => {
    if (empresaSelecionada) {
      const visivel =
        empresaSelecionada.permitir_cliente_ver_diagnostico !== undefined
          ? !!empresaSelecionada.permitir_cliente_ver_diagnostico
          : !!empresaSelecionada.permitir_cliente_ver_comparador
      setLiberadoParaCliente(visivel)
      setPercentualAlerta(empresaSelecionada.percentual_alerta_diagnostico ?? 10)

      // Carregar faturamento real mais recente
      const puxarUltimo = async () => {
        try {
          const res = await pb.collection('lancamentos_faturamento').getList(1, 1, {
            filter: `empresa_id = '${empresaSelecionada.id}'`,
            sort: '-competencia',
          })
          if (res.items.length > 0) {
            const fat = Number(res.items[0].total_faturamento_liquido) || 50000
            setFaturamentoSimulado(fat)
            setRbt12Simulado(fat * 12)
            setFolha12mSimulada(fat * 12 * 0.3)
          }
        } catch {
          /* intentionally ignored */
        }
      }
      puxarUltimo()
    }
  }, [empresaSelecionada])

  // Alternar permissão de visualização do cliente
  const toggleVisaoCliente = async () => {
    if (!empresaSelecionada || !isContador) return
    const novoStatus = !liberadoParaCliente
    try {
      await pb.collection('empresas').update(empresaSelecionada.id, {
        permitir_cliente_ver_diagnostico: novoStatus,
        permitir_cliente_ver_comparador: novoStatus,
      })
      setLiberadoParaCliente(novoStatus)
    } catch (e) {
      console.error(e)
    }
  }

  // Atualizar percentual de gatilho para alerta
  const handleSalvarPercentual = async () => {
    if (!empresaSelecionada || !isContador) return
    setSalvandoParametro(true)
    try {
      await pb.collection('empresas').update(empresaSelecionada.id, {
        percentual_alerta_diagnostico: percentualAlerta,
      })
    } catch (e) {
      console.error('Erro ao atualizar percentual de alerta:', e)
    } finally {
      setSalvandoParametro(false)
    }
  }

  // Executar diagnóstico comparativo simultâneo
  const comparativo: ComparativoRegimesResultado = useMemo(() => {
    const regAtual = empresaSelecionada?.regime_vigente || 'Simples Nacional'
    return compararRegimesTributarios(
      {
        regime: regAtual,
        competencia: '2025-05',
        rbt12: rbt12Simulado,
        folha12m: folha12mSimulada,
        reformaTributariaAtiva,
        linhas: [
          {
            linhaId: 'diag_1',
            nomeLinha: 'Receita Operacional Analisada',
            tipoReceita: 'servicos',
            anexoSimples: 'III',
            sujeitoFatorR: true,
            valorBruto: faturamentoSimulado,
            aliquotaMunicipalIss: 0.05,
          },
        ],
      },
      PARAMETROS_VIGENTES_PADRAO,
    )
  }, [
    empresaSelecionada,
    faturamentoSimulado,
    rbt12Simulado,
    folha12mSimulada,
    reformaTributariaAtiva,
  ])

  // Dados para o gráfico de barras comparativo lado a lado
  const dadosGrafico = [
    {
      nome: 'Simples Nacional',
      impostoMensal: comparativo.simples.impostoTotal,
      impostoAnual: comparativo.simples.impostoTotal * 12,
      aliquotaEfetiva: (comparativo.simples.aliquotaEfetivaGlobal * 100).toFixed(2),
    },
    {
      nome: 'Lucro Presumido',
      impostoMensal: comparativo.presumido.impostoTotal,
      impostoAnual: comparativo.presumido.impostoTotal * 12,
      aliquotaEfetiva: (comparativo.presumido.aliquotaEfetivaGlobal * 100).toFixed(2),
    },
    {
      nome: 'Lucro Real',
      impostoMensal: comparativo.real.impostoTotal,
      impostoAnual: comparativo.real.impostoTotal * 12,
      aliquotaEfetiva: (comparativo.real.aliquotaEfetivaGlobal * 100).toFixed(2),
    },
  ]

  const nomeFantasia =
    empresaSelecionada?.nome_fantasia || empresaSelecionada?.razao_social || 'sua empresa'

  const nomeContadorResponsavel =
    user?.role === 'contador' && user.name ? user.name : 'Equipe Contábil Dominus'

  // Exportar Diagnóstico em PDF formatado para impressão profissional
  const exportarDiagnosticoPdf = () => {
    const hoje = new Date()
    const dataEmissaoFormatada = hoje.toLocaleDateString('pt-BR')
    const competenciaFormatada = '05/2025'

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Diagnóstico Fiscal - ${empresaSelecionada?.razao_social || 'Cliente'}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-badge {
            width: 40px;
            height: 40px;
            background: #0284c7;
            color: #ffffff;
            font-weight: 900;
            font-size: 20px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            line-height: 40px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .doc-tag {
            font-size: 11px;
            font-weight: 700;
            background: #e0f2fe;
            color: #0369a1;
            padding: 4px 8px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .meta-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .meta-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; }
          .meta-item span { font-size: 13px; font-weight: 600; color: #1e293b; }
          .parecer-box {
            background: #f0fdfa;
            border-left: 4px solid #0d9488;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 24px;
          }
          .parecer-title {
            font-size: 14px;
            font-weight: 800;
            color: #0f766e;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .parecer-text { font-size: 13px; color: #134e4a; }
          .economia-badge {
            margin-top: 10px;
            font-size: 15px;
            font-weight: 800;
            color: #0f766e;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #cbd5e1;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
          }
          .highlight-row {
            background: #ecfeff;
            font-weight: 700;
          }
          .tag-rec {
            background: #d97706;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
          .signature-box {
            margin-top: 40px;
            text-align: right;
            padding-right: 20px;
          }
          .signature-line {
            display: inline-block;
            border-top: 1px solid #0f172a;
            width: 250px;
            text-align: center;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 600;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="logo-badge">D</div>
            <div>
              <div class="brand-title">DOMINUS PORTAL CONTÁBIL</div>
              <div style="font-size: 11px; color: #64748b;">Inteligência e Consultoria Tributária Estratégica</div>
            </div>
          </div>
          <div class="doc-tag">Diagnóstico Fiscal</div>
        </div>

        <div class="meta-box">
          <div class="meta-item">
            <strong>Empresa</strong>
            <span>${empresaSelecionada?.razao_social || 'N/A'} (${empresaSelecionada?.cnpj || 'N/A'})</span>
          </div>
          <div class="meta-item">
            <strong>Nome Fantasia</strong>
            <span>${nomeFantasia}</span>
          </div>
          <div class="meta-item">
            <strong>Competência de Análise</strong>
            <span>${competenciaFormatada}</span>
          </div>
          <div class="meta-item">
            <strong>Data de Emissão</strong>
            <span>${dataEmissaoFormatada}</span>
          </div>
          <div class="meta-item">
            <strong>Regime Vigente</strong>
            <span>${empresaSelecionada?.regime_vigente || 'Simples Nacional'}</span>
          </div>
          <div class="meta-item">
            <strong>Receita Bruta Projetada (12m)</strong>
            <span>R$ ${rbt12Simulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="parecer-box">
          <div class="parecer-title">PARECER DOMINUS: ${comparativo.regimeMaisEconomico}</div>
          <div class="parecer-text">
            Com base nos dados informados, o regime ${comparativo.regimeMaisEconomico} apresenta a menor carga tributária para a ${nomeFantasia}. A economia projetada em relação ao segundo regime mais econômico é de R$ ${comparativo.economiaAnualProjetada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano.
          </div>
          <div class="economia-badge">
            ECONOMIA IDENTIFICADA: R$ ${comparativo.economiaAnualProjetada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
          </div>
        </div>

        <h3 style="font-size: 13px; text-transform: uppercase; color: #334155; margin-bottom: 8px;">
          Comparativo dos Regimes Tributários
        </h3>
        <table>
          <thead>
            <tr>
              <th>Regime Tributário</th>
              <th>Carga Mensal Estimada</th>
              <th>Projeção Anual</th>
              <th>Alíquota Efetiva Calculada</th>
              <th>Status do Parecer</th>
            </tr>
          </thead>
          <tbody>
            <tr class="${comparativo.regimeMaisEconomico === 'Simples Nacional' ? 'highlight-row' : ''}">
              <td>Simples Nacional</td>
              <td>R$ ${comparativo.simples.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>R$ ${(comparativo.simples.impostoTotal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>${(comparativo.simples.aliquotaEfetivaGlobal * 100).toFixed(2)}%</td>
              <td>${comparativo.regimeMaisEconomico === 'Simples Nacional' ? '<span class="tag-rec">Recomendado</span>' : 'Alternativo'}</td>
            </tr>
            <tr class="${comparativo.regimeMaisEconomico === 'Lucro Presumido' ? 'highlight-row' : ''}">
              <td>Lucro Presumido</td>
              <td>R$ ${comparativo.presumido.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>R$ ${(comparativo.presumido.impostoTotal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>${(comparativo.presumido.aliquotaEfetivaGlobal * 100).toFixed(2)}%</td>
              <td>${comparativo.regimeMaisEconomico === 'Lucro Presumido' ? '<span class="tag-rec">Recomendado</span>' : 'Alternativo'}</td>
            </tr>
            <tr class="${comparativo.regimeMaisEconomico === 'Lucro Real' ? 'highlight-row' : ''}">
              <td>Lucro Real (Projeção)</td>
              <td>R$ ${comparativo.real.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>R$ ${(comparativo.real.impostoTotal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>${(comparativo.real.aliquotaEfetivaGlobal * 100).toFixed(2)}%</td>
              <td>${comparativo.regimeMaisEconomico === 'Lucro Real' ? '<span class="tag-rec">Recomendado</span>' : 'Alternativo'}</td>
            </tr>
          </tbody>
        </table>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 11px; color: #475569; margin-bottom: 24px;">
          <strong>Memória de Cálculo Resumida:</strong> Faturamento do mês de R$ ${faturamentoSimulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}; Folha dos últimos 12 meses de R$ ${folha12mSimulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Fator R apurado em ${comparativo.simples.fatorR ? (comparativo.simples.fatorR.percentual * 100).toFixed(1) + '%' : 'N/A'}). Parâmetros fiscais vigentes da Receita Federal e legislação complementar.
        </div>

        <div class="signature-box">
          <div class="signature-line">
            ${nomeContadorResponsavel}<br />
            <span style="font-size: 10px; color: #64748b; font-weight: normal;">Contador Responsável • Dominus Contábil</span>
          </div>
        </div>

        <div class="footer">
          Documento gerado pela plataforma Dominus Portal. Estimativa para planejamento. A apuração oficial é responsabilidade do contador.
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 350)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Oficial do Diagnóstico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Diagnóstico Fiscal Dominus</h2>
            <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px]">
              Consultoria Estratégica
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise comparativa dos regimes tributários da sua empresa, com recomendação estratégica
            e economia projetada pela sua equipe contábil.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isContador && empresaSelecionada && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVisaoCliente}
              className={`text-xs ${liberadoParaCliente ? 'border-primary text-primary' : 'text-muted-foreground'}`}
            >
              {liberadoParaCliente ? (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Visão Liberada ao Cliente
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Visão Oculta ao Cliente (Interna)
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={exportarDiagnosticoPdf}
            className="text-xs bg-card hover:bg-muted"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Exportar Diagnóstico
          </Button>
        </div>
      </div>

      {/* Configuração de Parâmetro de Alerta (Visão do Contador) */}
      {isContador && empresaSelecionada && (
        <div className="p-3 rounded-lg bg-card border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Percent className="w-4 h-4 text-primary" />
            <span>
              Gatilho de oportunidade tributária para{' '}
              <strong className="text-foreground">{nomeFantasia}</strong>: disparar notificação
              quando a economia ultrapassar:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={100}
              value={percentualAlerta}
              onChange={(e) => setPercentualAlerta(parseFloat(e.target.value) || 10)}
              className="h-8 w-20 text-xs font-mono text-center"
            />
            <span className="font-semibold text-muted-foreground">%</span>
            <Button
              size="sm"
              onClick={handleSalvarPercentual}
              disabled={salvandoParametro}
              className="h-8 text-xs bg-primary text-primary-foreground"
            >
              {salvandoParametro ? 'Salvando...' : 'Salvar Gatilho'}
            </Button>
          </div>
        </div>
      )}

      {/* Seletor de Empresa e Parâmetros de Entrada */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {isContador && (
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Empresa em Análise:
                </Label>
                <select
                  value={empresaSelecionada?.id || ''}
                  onChange={(e) => {
                    const emp = empresas.find((x) => x.id === e.target.value) || null
                    setEmpresaSelecionada(emp)
                  }}
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.razao_social} ({e.regime_vigente})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Faturamento do mês (R$):
              </Label>
              <Input
                type="number"
                step="1000"
                value={faturamentoSimulado}
                onChange={(e) => {
                  const f = parseFloat(e.target.value) || 0
                  setFaturamentoSimulado(f)
                  setRbt12Simulado(f * 12)
                  setFolha12mSimulada(f * 12 * 0.3)
                }}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Receita bruta dos últimos 12 meses (R$):
              </Label>
              <Input
                type="number"
                step="1000"
                value={rbt12Simulado}
                onChange={(e) => setRbt12Simulado(parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Folha de pagamento dos últimos 12 meses (R$):
              </Label>
              <Input
                type="number"
                step="1000"
                value={folha12mSimulada}
                onChange={(e) => setFolha12mSimulada(parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Os valores são preenchidos automaticamente pelo sistema. Altere apenas para simular
            cenários diferentes.
          </p>
        </CardContent>
      </Card>

      {/* Cartão de Recomendação Estratégica (Parecer Dominus) */}
      <div className="space-y-1.5">
        <div className="p-5 rounded-xl border border-primary/40 bg-primary/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <strong className="text-sm font-bold uppercase tracking-wide text-foreground">
                PARECER DOMINUS: {comparativo.regimeMaisEconomico}
              </strong>
            </div>
            <p className="leading-relaxed text-xs text-foreground/90">
              Com base nos dados informados, o regime {comparativo.regimeMaisEconomico} apresenta a
              menor carga tributária para a {nomeFantasia}. A economia projetada em relação ao
              segundo regime mais econômico é de R${' '}
              {comparativo.economiaAnualProjetada.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
              /ano.
            </p>
          </div>

          <div className="text-left md:text-right shrink-0">
            <span className="text-[10px] uppercase font-mono block text-muted-foreground">
              ECONOMIA IDENTIFICADA
            </span>
            <span className="text-2xl font-extrabold font-mono text-primary">
              R${' '}
              {comparativo.economiaAnualProjetada.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground pl-1">
          Estimativa para planejamento. A apuração oficial e a recomendação formal são feitas pela
          sua equipe Dominus.
        </p>
      </div>

      {/* Grid de Cartões dos 3 Regimes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão Simples Nacional */}
        <Card
          className={`border-border bg-card relative ${comparativo.regimeMaisEconomico === 'Simples Nacional' ? 'border-amber-500/80 ring-1 ring-amber-500/40' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Simples Nacional</CardTitle>
              {comparativo.regimeMaisEconomico === 'Simples Nacional' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-slate-950 shadow-sm">
                  Recomendado
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              Alíquota efetiva calculada:{' '}
              <strong className="text-foreground">
                {(comparativo.simples.aliquotaEfetivaGlobal * 100).toFixed(2)}%
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                CARGA MENSAL ESTIMADA
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                R${' '}
                {comparativo.simples.impostoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Projeção anual:</span>
                <span className="text-foreground font-semibold">
                  R${' '}
                  {(comparativo.simples.impostoTotal * 12).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fator R calculado:</span>
                <span className="text-foreground">
                  {comparativo.simples.fatorR
                    ? `${(comparativo.simples.fatorR.percentual * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartão Lucro Presumido */}
        <Card
          className={`border-border bg-card relative ${comparativo.regimeMaisEconomico === 'Lucro Presumido' ? 'border-amber-500/80 ring-1 ring-amber-500/40' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Lucro Presumido</CardTitle>
              {comparativo.regimeMaisEconomico === 'Lucro Presumido' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-slate-950 shadow-sm">
                  Recomendado
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              Alíquota efetiva calculada:{' '}
              <strong className="text-foreground">
                {(comparativo.presumido.aliquotaEfetivaGlobal * 100).toFixed(2)}%
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                CARGA MENSAL ESTIMADA
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                R${' '}
                {comparativo.presumido.impostoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Projeção anual:</span>
                <span className="text-foreground font-semibold">
                  R${' '}
                  {(comparativo.presumido.impostoTotal * 12).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base de presunção (IRPJ/CSLL):</span>
                <span className="text-foreground">32,0%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartão Lucro Real */}
        <Card
          className={`border-border bg-card relative ${comparativo.regimeMaisEconomico === 'Lucro Real' ? 'border-amber-500/80 ring-1 ring-amber-500/40' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Lucro Real (Projeção)</CardTitle>
              {comparativo.regimeMaisEconomico === 'Lucro Real' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-slate-950 shadow-sm">
                  Recomendado
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              Alíquota efetiva calculada:{' '}
              <strong className="text-foreground">
                {(comparativo.real.aliquotaEfetivaGlobal * 100).toFixed(2)}%
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                CARGA MENSAL ESTIMADA
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                R${' '}
                {comparativo.real.impostoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Projeção anual:</span>
                <span className="text-foreground font-semibold">
                  R${' '}
                  {(comparativo.real.impostoTotal * 12).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base de presunção (IRPJ/CSLL):</span>
                <span className="text-foreground">Lucro Efetivo / Não-Cumulativo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Comparativo de Barras */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              Comparativo anual por regime (R$)
            </CardTitle>
            <CardDescription className="text-xs">
              Projeção comparada em 12 meses com base nos faturamentos e deduções informados.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
              Regime recomendado
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
              Demais regimes
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="nome" stroke="#94a3b8" fontSize={11} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => {
                  const mil = v / 1000
                  return `R$ ${mil.toFixed(0)} mil`
                }}
              />
              <Tooltip
                formatter={(v: string | number | readonly (string | number)[] | undefined) => [
                  `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  'Custo Anual Projetado',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="impostoAnual"
                name="Comparativo anual por regime (R$)"
                radius={[4, 4, 0, 0]}
              >
                {dadosGrafico.map((entry) => {
                  const isRec = entry.nome === comparativo.regimeMaisEconomico
                  return (
                    <Cell
                      key={`bar-${entry.nome}`}
                      fill={isRec ? '#06b6d4' : '#64748b'} // Ciano para o recomendado, cinza médio para os demais
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
export default DiagnosticoFiscalTela
