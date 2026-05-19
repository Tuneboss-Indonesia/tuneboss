<?php

use App\Http\Controllers\Api\AppController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/health', [AppController::class, 'health']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/app/bootstrap', [AppController::class, 'bootstrap']);

    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::patch('/auth/password', [AuthController::class, 'updatePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}/password', [UserController::class, 'updatePassword']);
        Route::patch('/users/{user}/deactivate', [UserController::class, 'deactivate']);

        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/priority-products', [DashboardController::class, 'priorityProducts']);
    Route::get('/dashboard/recent-activities', [DashboardController::class, 'recentActivities']);
    Route::get('/dashboard/sales-chart', [DashboardController::class, 'salesChart']);
    Route::get('/dashboard/top-products', [DashboardController::class, 'topProducts']);

    Route::get('/products/lookup', [ProductController::class, 'lookup']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::post('/products', [ProductController::class, 'store'])->middleware('role:admin');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('role:admin');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('role:admin');

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::post('/categories', [CategoryController::class, 'store'])->middleware('role:admin');
    Route::patch('/categories/{category}', [CategoryController::class, 'update'])->middleware('role:admin');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->middleware('role:admin');

    Route::get('/stock/movements', [StockController::class, 'movements']);
    Route::post('/stock/inbound', [StockController::class, 'inbound']);
    Route::post('/stock/outbound', [StockController::class, 'outbound']);
    Route::post('/stock/adjustment', [StockController::class, 'adjustment'])->middleware('role:admin');

    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
    Route::post('/sales/{sale}/void', [SaleController::class, 'void'])->middleware('role:admin');

    Route::get('/reports/stock', [ReportController::class, 'stock']);
    Route::get('/reports/summary', [ReportController::class, 'summary']);
    Route::get('/reports/sales', [ReportController::class, 'sales']);
    Route::get('/reports/inbound', [ReportController::class, 'inbound']);
    Route::get('/reports/outbound', [ReportController::class, 'outbound']);
});
