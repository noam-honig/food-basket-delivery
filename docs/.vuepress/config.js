const { description } = require('../../package')
//const apiSideBar = require('./api-sidebar.json');
module.exports = {
 /* theme: 'default-rtl',*/
  base:'/hagai-docs/',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'חגי - אפליקציה לניהול חלוקת סלי מזון',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: '',
    editLinks: false,
    logo:'https://salmaz.herokuapp.com/assets/apple-touch-icon.png',
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    nav: [
      {
        text: 'מדריך למנהל',
        link: '/guide/',
      }/*,
      {
        text: 'Config',
        link: '/config/'
      },
      {
        text: 'VuePress',
        link: 'https://v1.vuepress.vuejs.org'
      }*/
    ],
    sidebar: {
      '/guide/': [
        {
          title: 'מדריך למנהל',
          collapsable: false,
          children: [
            '',
            'delivery-followup',
            'requires-care',
            'family-info',
            'use-table',
            'active-deliveries',
            'families',
            'add-family',
            'volunteers',
            'new-delivery-day',
            'distribution-map',
            'import-from-excel',
            'add-to-home-screen',
            'events',
            'no-addresses'
            
          
          ]
        }
      ]
      ,
    }
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
