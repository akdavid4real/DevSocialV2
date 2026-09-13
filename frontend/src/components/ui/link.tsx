import React from "react";
import { Link as RouterLink } from "react-router-dom";

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

const PROTOCOL_RELATIVE = /^(?:[a-z+.-]+:)?\/\//i;

function isExternal(href: string) {
  return (
    PROTOCOL_RELATIVE.test(href) ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  );
}

/**
 * `<Link href>` stays the app-wide API. In-app hrefs route through React Router
 * — which already handles modifier-clicks, middle-clicks and `target` — while
 * external hrefs fall back to a plain anchor.
 */
export default function Link({ href, ...props }: LinkProps) {
  if (isExternal(href) || props.target) {
    return <a href={href} {...props} />;
  }

  return <RouterLink to={href} {...props} />;
}
