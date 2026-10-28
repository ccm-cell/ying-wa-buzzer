import React from 'react';
import { Container } from 'react-bootstrap';

export function CreatorCredit() {
  return <p className="creator-credit">創作者：CCM</p>;
}

export function FooterSimple() {
  return (
    <div id="footer-simple">
      <CreatorCredit />
      Built on{' '}
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://github.com/wsun/multibuzzer"
      >
        open source
      </a>
    </div>
  );
}

/**
 * Footer component
 * @param {bool} mobileOnly - only display on mobile devices, <768 px
 */
export default function Footer({ mobileOnly = false }) {
  return (
    <footer className={mobileOnly ? 'd-block d-md-none' : null}>
      <Container>
        <div>
          <CreatorCredit />
          Built on{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/wsun/multibuzzer"
          >
            open source
          </a>
        </div>
      </Container>
    </footer>
  );
}
