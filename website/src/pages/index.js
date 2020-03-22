import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: <>Simplicity</>,
    description: (
      <>Easy to extend, configure or override, owing to ES6 classes.</>
    )
  },
  {
    title: <>Validation</>,
    description: (
      <>Including validation for JSON fields, similar to Mongoose.js.</>
    )
  },
  {
    title: <>Plugin support</>,
    description: (
      <>Allows sharing customisations.Also supports custom plugins.</>
    )
  },
  {
    title: <>Transactions</>,
    description: <>Including callback-based and procedural transactions.</>
  },
  { title: <>Relations</>, description: <>Implemented through SQL joins.</> },
  {
    title: <>Virtual fields</>,
    description: (
      <>With support for `async` gettters(suitable for GraphQl for instance).</>
    )
  },
  {
    title: <>Value casting</>,
    description: <>Before save(insert or update) and after fetch operations.</>
  },
  {
    title: <>Custom errors</>,
    description: (
      <>Custom error classes for all errors, including database errors.</>
    )
  },
  {
    title: <>Well tested</>,
    description: <>Extensive test coverage, plugins included.</>
  }
];

function Feature({ title, description }) {
  return (
    <div className={classnames('col col--4', styles.feature)}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout title={siteConfig.title} description="Class-based JavaScript ORM">
      <header className={classnames('hero', styles.heroBanner)}>
        <div className="container">
          <img alt="Knorm logo" src={useBaseUrl('img/logo.svg')} />
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={classnames(
                'button button--primary button--lg',
                styles.getStarted
              )}
              to={useBaseUrl('docs/getting-started/introduction')}
            >
              Get Started &nbsp; →
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, index) => (
                  <Feature key={index} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;
