<?php

use App\Console\Commands\DatabaseBackup;
use App\Http\Middleware\CorsHeaders;
use App\Http\Middleware\EnsureRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withCommands([
        DatabaseBackup::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(CorsHeaders::class);

        $middleware->alias([
            'role' => EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $exception) {
            return response()->json([
                'message' => 'Validation failed.',
                'code' => 'validation_failed',
                'errors' => $exception->errors(),
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $exception) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'unauthenticated',
            ], 401);
        });

        $exceptions->render(function (ModelNotFoundException $exception) {
            return response()->json([
                'message' => 'Resource not found.',
                'code' => 'not_found',
            ], 404);
        });

        $exceptions->render(function (HttpExceptionInterface $exception) {
            $status = $exception->getStatusCode();

            if (! in_array($status, [401, 403, 404, 422, 429], true)) {
                return null;
            }

            $codes = [
                401 => 'unauthenticated',
                403 => 'forbidden',
                404 => 'not_found',
                422 => 'unprocessable_entity',
                429 => 'too_many_requests',
            ];

            return response()->json([
                'message' => $exception->getMessage() ?: match ($status) {
                    401 => 'Unauthenticated.',
                    403 => 'Forbidden.',
                    404 => 'Resource not found.',
                    422 => 'Request cannot be processed.',
                    429 => 'Too many requests.',
                },
                'code' => $codes[$status],
            ], $status);
        });
    })->create();
