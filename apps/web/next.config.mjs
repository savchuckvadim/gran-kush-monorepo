import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async redirects() {
    return [
      // Redirect /home to root for each locale
      {
        source: '/:locale/home',
        destination: '/:locale',
        permanent: true,
      },
    ];
  },
}

export default withNextIntl(nextConfig);
