'use client'

import { useEffect } from 'react'

/**
 * Comeca a pagina no topo ao carregar ou recarregar.
 *
 * Por padrao o navegador guarda a posicao de rolagem e a restaura no refresh
 * (`history.scrollRestoration === 'auto'`). Numa pagina longa como a landing
 * isso faz o recarregamento cair no meio do documento, e ainda briga com a
 * rolagem suave de `scroll-behavior: smooth` — as duas disputam a posicao ao
 * mesmo tempo e o resultado e imprevisivel.
 *
 * `manual` desliga a restauracao e devolve o controle para a pagina.
 *
 * **Link com ancora continua funcionando.** Se a URL trouxer um hash
 * (`/#planos`, compartilhado por alguem), respeitamos o destino em vez de
 * forcar o topo — senao a correcao quebraria todo link profundo do rodape.
 */
export default function ScrollRestoration() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    if (!window.location.hash) {
      /* `instant` e nao `smooth`: ao abrir a pagina nao ha de onde animar. */
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [])

  return null
}
