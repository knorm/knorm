module.exports = {
  title: 'Knorm',
  description: 'A JavaScript ORM written using ES6 classes',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      {
        text: 'Guides',
        items: [
          { text: 'Models', link: '/guides/models' },
          { text: 'Fields', link: '/guides/fields' },
          { text: 'Virtuals', link: '/guides/virtuals' },
          { text: 'Queries', link: '/guides/queries' },
          { text: 'Transactions', link: '/guides/transactions' },
          { text: 'Validation', link: '/guides/validation' },
          { text: 'Plugins', link: '/guides/plugins' },
          { text: 'Debugging', link: '/guides/debugging' }
        ]
      },
      {
        text: 'API Docs',
        items: [
          { text: '@knorm/knorm', link: '/api/knorm' }
        ]
      },
      {
        text: 'Plugins',
        items: [
          { text: '@knorm/postgres', link: '/plugins/postgres' },
          { text: '@knorm/to-json', link: '/plugins/to-json' },
          { text: '@knorm/relations', link: '/plugins/relations' },
          { text: '@knorm/soft-delete', link: '/plugins/soft-delete' },
          { text: '@knorm/paginate', link: '/plugins/paginate' },
          { text: '@knorm/timestamps', link: '/plugins/timestamps' }
        ]
      },
      {
        text: 'Changelogs',
        items: [
          { text: '@knorm/knorm', link: '/changelogs/knorm.md' },
          { text: '@knorm/knorm-paginate', link: '/changelogs/knorm-paginate.md' },
          { text: '@knorm/knorm-postgres', link: '/changelogs/knorm-postgres.md' },
          { text: '@knorm/knorm-relations', link: '/changelogs/knorm-relations.md' },
          { text: '@knorm/knorm-to-json', link: '/changelogs/knorm-to-json.md' },
          { text: '@knorm/knorm', link: '/changelogs/knorm.md' },
          { text: '@knorm/knorm', link: '/changelogs/knorm.md' },
          { text: '@knorm/knorm', link: '/changelogs/knorm.md' },
        ]
      },
      {
        text: 'About',
        items: [
          { text: 'LICENSE', link: '/LICENSE' },
          { text: 'Credits', link: '/credits' }
        ]
      },
      { text: 'Github', link: 'https://github.com/knorm/knorm' },
      { text: 'Example', link: 'https://github.com/knorm/example' },
    ],
    sidebar: [
      '/',
      '/getting-started',
      {
        title: 'Guides',
        collapsable: false,
        children: [
          '/guides/models',
          '/guides/fields',
          '/guides/virtuals',
          '/guides/queries',
          '/guides/transactions',
          '/guides/validation',
          '/guides/plugins',
          '/guides/debugging'
        ]
      },
      {
        title: 'API Docs',
        children: [
          { title: '@knorm/knorm', path: '/api/knorm' }
        ]
      },
      {
        title: 'Plugins',
        children: [
          '/plugins/postgres',
          '/plugins/to-json',
          '/plugins/relations',
          '/plugins/soft-delete',
          '/plugins/paginate',
          '/plugins/timestamps'
        ]
      },
      ['/LICENSE', 'LICENSE' ],
      ['/credits', 'Credits' ]
    ],
    sidebarDepth: 2,
    lastUpdated: 'Last updated',
    markdown: {
      lineNumbers: true
    }
  }
};
