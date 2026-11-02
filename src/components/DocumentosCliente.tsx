import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Download, Calendar, Layers, ArrowUpRight } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { DocumentoFiscal } from '@/types/dominus'

export const DocumentosCliente: React.FC = () => {
  const { empresa, user } = useAuth()
  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([])
  const [carregando, setCarregando] = useState(true)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregarDocumentos = async () => {
    if (!empresa?.id) return
    setCarregando(true)
    try {
      const res = await pb.collection('documentos').getList(1, 50, {
        filter: `empresa_id = '${empresa.id}'`,
        sort: '-created',
      })
      setDocumentos(res.items as unknown as DocumentoFiscal[])
    } catch (e) {
      console.warn('Erro ao carregar documentos:', e)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDocumentos()
  }, [empresa?.id])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arquivo || !empresa?.id) return
    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('empresa_id', empresa.id)
      formData.append('titulo', titulo || arquivo.name)
      formData.append('tipo', 'outro')
      formData.append('arquivo', arquivo)
      formData.append('enviado_por_role', 'cliente')
      formData.append('observacao', 'Enviado pelo portal do cliente')

      await pb.collection('documentos').create(formData)
      setArquivo(null)
      setTitulo('')
      carregarDocumentos()
      alert('Documento enviado com sucesso para a contabilidade!')
    } catch (err) {
      console.error(err)
      alert('Erro ao enviar documento.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Guias e Documentos da Empresa</h2>
          <p className="text-xs text-muted-foreground">
            Acesse suas guias de recolhimento DAS/DARF e envie relatórios fiscais para o contador.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Envio */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Enviar Documento ao Contador
              </CardTitle>
              <CardDescription className="text-xs">
                Upload de PDF de notas, extrato de faturamento ou XML.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Título do Documento</label>
                  <input
                    type="text"
                    placeholder="Ex: Extrato de Vendas Março 2025"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg p-2 text-foreground text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    Arquivo (PDF, XML, XLSX, ZIP)
                  </label>
                  <div className="border border-dashed border-border rounded-xl p-3 bg-muted/10 text-center">
                    <input
                      type="file"
                      required
                      accept=".pdf,.xml,.csv,.xlsx,.zip"
                      onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                      className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={enviando || !arquivo}
                  className="w-full bg-primary text-primary-foreground text-xs font-semibold"
                >
                  {enviando ? 'Enviando...' : 'Transmitir Documento'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Documentos Disponíveis */}
        <div className="lg:col-span-7">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Arquivos Disponíveis ({documentos.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={carregarDocumentos}
                  className="text-xs"
                >
                  Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Carregando lista de arquivos...
                </p>
              ) : documentos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Nenhum documento disponível no momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-border bg-muted/15 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-foreground font-semibold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          {doc.titulo}
                        </strong>
                        <p className="text-[11px] text-muted-foreground">
                          Tipo: {doc.tipo} • Enviado por: {doc.enviado_por_role} • Data:{' '}
                          {new Date(doc.created).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <a
                        href={pb.files.getURL(
                          doc as unknown as { [key: string]: unknown },
                          doc.arquivo,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
