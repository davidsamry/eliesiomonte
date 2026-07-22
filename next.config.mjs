/** @type {import('next').NextConfig} */
const nextConfig = {
  // Erros de TypeScript agora quebram o build (verificado: 0 erros no projeto).
  // Saída standalone: gera um servidor Node mínimo para container (EasyPanel/Docker).
  output: 'standalone',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
