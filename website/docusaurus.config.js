module.exports = {
  title: 'Knorm',
  tagline: 'Class-based JavaScript ORM',
  url: 'https://knorm.netlify.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'knorm',
  projectName: 'knorm',
  themeConfig: {
    navbar: {
      title: 'Knorm',
      logo: {
        alt: 'Knorm Logo',
        src: 'img/logo.svg'
      },
      links: [
        {
          to: 'docs/getting-started/introduction',
          activeBasePath: 'docs/getting-started',
          label: 'Getting started',
          position: 'left'
        },
        {
          to: 'docs/guides/models',
          activeBasePath: 'docs/guides',
          label: 'Guides',
          position: 'left'
        },
        {
          to: 'docs/plugins/postgres',
          activeBasePath: 'docs/plugins',
          label: 'Plugins',
          position: 'left'
        },
        {
          to: 'docs/credits',
          label: 'Credits',
          position: 'right'
        },
        {
          href: 'https://github.com/knorm/knorm',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2017-${new Date().getFullYear()} Joel Mukuthu. Docs built with Docusaurus.`
    }
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/knorm/knorm/edit/master/website/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ]
};
