import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt"> {/* Ajustado para idioma padrão português, conforme o frontend */}
      <Head>
        {/*
          Configuração do Favicon Arcano-Neon (SVG)
          O Next.js prioriza links definidos aqui ou na pasta public/.
          Usar SVG garante alta resolução em todas as telas.
        */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        {/* Define o título da aba do navegador */}
        <title>ArcaneTasks | Plataforma Colaborativa</title>

        {/* Metatag de descrição (Opcional, mas boa prática) */}
        <meta name="description" content="ArcaneTasks: Plataforma colaborativa event-driven construída com React, Fastify e K8s." />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}