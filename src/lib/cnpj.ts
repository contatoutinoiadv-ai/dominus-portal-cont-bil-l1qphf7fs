/**
 * Utilitários de CNPJ do Dominus Portal Contábil.
 * Validação pelos dois dígitos verificadores (módulo 11) e formatação padrão
 * XX.XXX.XXX/XXXX-XX.
 */

/** Remove máscara e mantém apenas dígitos. */
export function removerMascaraCnpj(valor: string): string {
  return (valor || '').replace(/\D/g, '')
}

/** Aplica a máscara padrão quando o valor possui os 14 dígitos. */
export function formatarCnpj(valor: string): string {
  const digitos = removerMascaraCnpj(valor)
  if (digitos.length !== 14) return valor || ''
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/** Máscara progressiva para digitação no formulário (aceita trecho incompleto). */
export function mascararCnpjParcial(valor: string): string {
  const digitos = removerMascaraCnpj(valor).slice(0, 14)
  let saida = digitos
  if (digitos.length > 2) saida = `${digitos.slice(0, 2)}.${digitos.slice(2)}`
  if (digitos.length > 5)
    saida = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`
  if (digitos.length > 8)
    saida = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`
  if (digitos.length > 12)
    saida = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(
      8,
      12,
    )}-${digitos.slice(12)}`
  return saida
}

function calcularDigito(base: string, pesos: number[]): number {
  let soma = 0
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * pesos[i]
  }
  const resto = soma % 11
  const resultado = 11 - resto
  return resultado >= 10 ? 0 : resultado
}

/** Valida o CNPJ informado (aceita com ou sem máscara). */
export function validarCnpj(valor: string): boolean {
  const cnpj = removerMascaraCnpj(valor)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const pesosPrimeiro = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesosSegundo = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const digito1 = calcularDigito(cnpj.slice(0, 12), pesosPrimeiro)
  if (digito1 !== Number(cnpj[12])) return false

  const digito2 = calcularDigito(cnpj.slice(0, 13), pesosSegundo)
  if (digito2 !== Number(cnpj[13])) return false

  return true
}
