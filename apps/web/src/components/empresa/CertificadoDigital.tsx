"use client";

import { useId, useRef, useState } from "react";
import {
  enviarCertificado,
  type Certificado,
} from "@/lib/empresa-api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/UI";
import { IconShield, IconTrash, IconUpload } from "@/components/Icons";
import { Spinner } from "@/components/auth/Fields";
import styles from "./empresa.module.css";

/**
 * Envio do certificado digital A1 (.pfx/.p12), necessario para emitir
 * NFC-e e NFS-e no modulo de Vendas.
 *
 * SEGURANCA: o arquivo e a senha vao direto para o backend por HTTPS. O
 * navegador nao abre o certificado nem guarda a senha — a validade
 * mostrada aqui vem da resposta do servidor.
 */
export default function CertificadoDigital({
  certificado,
  onChange,
}: {
  certificado: Certificado | null;
  onChange: (certificado: Certificado | null) => void;
}) {
  const inputId = useId();
  const senhaId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (!arquivo) {
      setErro("Escolha o arquivo do certificado.");
      return;
    }

    setErro(null);
    setEnviando(true);

    /* SUBSTITUIR POR: POST /empresa/certificado */
    const resultado = await enviarCertificado(arquivo, senha);
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.error);
      return;
    }

    onChange(resultado.certificado);
    setArquivo(null);
    setSenha("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function remover() {
    onChange(null);
    setArquivo(null);
    setSenha("");
    setErro(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  /* --- Estado: certificado ja enviado --- */
  if (certificado) {
    const expirado = certificado.status === "expirado";

    return (
      <div className={styles.certCard}>
        <div className={styles.certHead}>
          <span
            className={`${styles.certIcon} ${expirado ? styles.certIconWarn : ""}`}
          >
            <IconShield size={20} />
          </span>

          <div className={styles.certInfo}>
            <strong>{certificado.nomeArquivo}</strong>
            <span>{certificado.titular}</span>
          </div>

          {expirado ? (
            <Badge tone="warning">Expirado</Badge>
          ) : (
            <Badge tone="success">Valido</Badge>
          )}
        </div>

        <dl className={styles.certMeta}>
          <div>
            <dt>Valido ate</dt>
            <dd>{formatDate(certificado.validoAte)}</dd>
          </div>
          <div>
            <dt>Emissao fiscal</dt>
            <dd>{expirado ? "Bloqueada" : "Liberada"}</dd>
          </div>
        </dl>

        {expirado ? (
          <p className={styles.certAlert}>
            O certificado venceu. Ate enviar um novo, nao e possivel emitir
            NFC-e nem NFS-e.
          </p>
        ) : null}

        <Button variant="secondary" size="sm" onClick={remover}>
          <IconTrash size={15} />
          Trocar certificado
        </Button>
      </div>
    );
  }

  /* --- Estado: nenhum certificado --- */
  return (
    <div className={styles.certCard}>
      <div className={styles.certHead}>
        <span className={styles.certIcon}>
          <IconShield size={20} />
        </span>
        <div className={styles.certInfo}>
          <strong>Nenhum certificado enviado</strong>
          <span>Necessario para emitir NFC-e e NFS-e</span>
        </div>
        <Badge>Nao enviado</Badge>
      </div>

      <div className={styles.certForm}>
        <div className={styles.certField}>
          <label className={styles.certLabel} htmlFor={inputId}>
            Arquivo do certificado (.pfx ou .p12)
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept=".pfx,.p12"
            className={styles.certFile}
            disabled={enviando}
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setErro(null);
            }}
          />
        </div>

        <div className={styles.certField}>
          <label className={styles.certLabel} htmlFor={senhaId}>
            Senha do certificado
          </label>
          <input
            id={senhaId}
            type="password"
            className={styles.certInput}
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro(null);
            }}
            disabled={enviando}
            autoComplete="off"
            placeholder="Senha definida na emissao"
          />
        </div>
      </div>

      {erro ? (
        <p className={styles.certErro} role="alert">
          {erro}
        </p>
      ) : null}

      <Button onClick={enviar} disabled={enviando || !arquivo}>
        {enviando ? (
          <>
            <Spinner size={15} />
            Enviando...
          </>
        ) : (
          <>
            <IconUpload size={16} />
            Enviar certificado
          </>
        )}
      </Button>

      <p className={styles.certNota}>
        O arquivo e a senha sao enviados direto ao servidor por conexao
        segura. A senha nao fica guardada no navegador.
      </p>
    </div>
  );
}
