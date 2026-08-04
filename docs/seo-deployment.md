# SEO Deployment Notes

## Canonical routes

- `/` is the home page and the canonical route for the public landing page.
- `/sluzby` is the canonical services page.
- `/kontakt` is the canonical contact page.
- `/domov` is kept as a compatibility redirect to `/`.

## Static crawl files

- `public/robots.txt` exposes the sitemap.
- `public/sitemap.xml` lists the public canonical pages.

## Nginx guidance

If the app is deployed behind Nginx, keep the SPA fallback for client-side navigation and preserve the `/domov` redirect:

```nginx
location = /domov {
    return 301 /;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

If the server is configured to serve static files ahead of the SPA fallback, make sure the canonical routes still resolve to the app shell and keep the redirect above in place.

## Verification checklist

- Confirm page titles, descriptions, canonical links, and `og:` tags update on `/`, `/sluzby`, and `/kontakt`.
- Confirm `robots.txt` and `sitemap.xml` are publicly reachable.
- Confirm `/domov` redirects to `/`.
- Confirm the contact page has a visible H1 and the form still posts to `/api/contact.php`.
