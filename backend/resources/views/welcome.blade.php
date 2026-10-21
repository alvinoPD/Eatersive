<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Laravel') }} — API</title>
        <style>
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
                background: #0f172a;
                color: #e2e8f0;
            }
            main { max-width: 32rem; padding: 2rem; }
            h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
            p { line-height: 1.6; margin: 0 0 0.5rem; color: #94a3b8; }
            code { color: #f8fafc; background: #1e293b; padding: 0.15rem 0.4rem; border-radius: 0.25rem; }
            a { color: #38bdf8; }
        </style>
    </head>
    <body>
        <main>
            <h1>Laravel API berjalan</h1>
            <p>
                Ini adalah backend API. Antarmuka React berjalan terpisah melalui Vite
                (default <code>http://localhost:5173</code>).
            </p>
            <p>
                Health check: <a href="{{ url('/api/v1/health') }}">{{ url('/api/v1/health') }}</a>
            </p>
        </main>
    </body>
</html>
