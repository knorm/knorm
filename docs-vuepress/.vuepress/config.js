module.exports = {
  title: 'Knorm',
  description: 'A JavaScript ORM written only using ES6 classes',
  base: '/knorm/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Guides', link: '/guides/models' },
      { text: 'Github', link: 'https://github.com/knorm/knorm' },
    ],
    sidebar: [
      '/',
      '/getting-started',
      // '/guides/models',
      // '/guides/fields',
      // '/guides/plugins',
      ['/api', 'API Documentation']
    ],
    sidebarDepth: 2
  }
};
