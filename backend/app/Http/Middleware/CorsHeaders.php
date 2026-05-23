<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            return $this->withCorsHeaders(response()->noContent(), $request);
        }

        return $this->withCorsHeaders($next($request), $request);
    }

    private function withCorsHeaders(Response $response, Request $request): Response
    {
        $response->headers->set('Access-Control-Allow-Origin', $this->allowedOrigin($request));
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', $request->headers->get('Access-Control-Request-Headers') ?: 'Authorization, Content-Type, Accept, X-Requested-With');
        $response->headers->set('Access-Control-Max-Age', '86400');
        $response->headers->set('Vary', 'Origin, Access-Control-Request-Headers');

        return $response;
    }

    private function allowedOrigin(Request $request): string
    {
        $origins = array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))));
        $origin = $request->headers->get('Origin');

        if (in_array('*', $origins, true)) {
            return $origin ?: '*';
        }

        if ($origin && in_array($origin, $origins, true)) {
            return $origin;
        }

        if ($origin && preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
            return $origin;
        }

        return $origins[0] ?? '*';
    }
}
