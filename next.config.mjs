/** @type {import('next').NextConfig} */
const nextConfig = {
  // Erros de TypeScript agora quebram o build (verificado: 0 erros no projeto).
  images: {
    unoptimized: true,
  },
}

export default nextConfig
