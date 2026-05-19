<?php

use App\Http\Controllers\Api\AppController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RestockAlertController;
use App\Http\Controllers\Api\RestockOrderController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
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
    Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);

    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}/password', [UserController::class, 'updatePassword']);
        Route::patch('/users/{user}/deactivate', [UserController::class, 'deactivate']);

        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);

        Route::post('/customers', [CustomerController::class, 'store']);
        Route::patch('/customers/{customer}', [CustomerController::class, 'update']);
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);

        Route::post('/restock-alerts/{restockAlert}/resolve', [RestockAlertController::class, 'resolve']);

        Route::post('/restock-orders', [RestockOrderController::class, 'store']);
        Route::patch('/restock-orders/{restockOrder}', [RestockOrderController::class, 'update']);
        Route::post('/restock-orders/{restockOrder}/receive', [RestockOrderController::class, 'receive']);
        Route::post('/restock-orders/{restockOrder}/cancel', [RestockOrderController::class, 'cancel']);

        Route::get('/audit-logs/export', [AuditLogController::class, 'export']);
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/priority-products', [DashboardController::class, 'priorityProducts']);
    Route::get('/dashboard/recent-activities', [DashboardController::class, 'recentActivities']);
    Route::get('/dashboard/sales-chart', [DashboardController::class, 'salesChart']);
    Route::get('/dashboard/top-products', [DashboardController::class, 'topProducts']);

    Route::get('/restock-alerts', [RestockAlertController::class, 'index']);
    Route::post('/restock-alerts/{restockAlert}/acknowledge', [RestockAlertController::class, 'acknowledge']);
    Route::get('/restock-orders', [RestockOrderController::class, 'index']);

    Route::get('/products/lookup', [ProductController::class, 'lookup']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::post('/products', [ProductController::class, 'store'])->middleware('role:admin');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('role:admin');
    Route::post('/products/{product}/image', [ProductController::class, 'uploadImage'])->middleware('role:admin');
    Route::delete('/products/{product}/image', [ProductController::class, 'deleteImage'])->middleware('role:admin');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('role:admin');

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::post('/categories', [CategoryController::class, 'store'])->middleware('role:admin');
    Route::patch('/categories/{category}', [CategoryController::class, 'update'])->middleware('role:admin');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->middleware('role:admin');

    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show']);

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);

    Route::get('/stock/movements', [StockController::class, 'movements']);
    Route::post('/stock/inbound', [StockController::class, 'inbound']);
    Route::post('/stock/outbound', [StockController::class, 'outbound']);
    Route::post('/stock/adjustment', [StockController::class, 'adjustment'])->middleware('role:admin');

    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales/preview', [SaleController::class, 'preview']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
    Route::post('/sales/{sale}/void', [SaleController::class, 'void'])->middleware('role:admin');

    Route::get('/reports/stock', [ReportController::class, 'stock']);
    Route::get('/reports/stock/export', [ReportController::class, 'stockExport']);
    Route::get('/reports/summary', [ReportController::class, 'summary']);
    Route::get('/reports/sales', [ReportController::class, 'sales']);
    Route::get('/reports/sales/export', [ReportController::class, 'salesExport']);
    Route::get('/reports/inbound', [ReportController::class, 'inbound']);
    Route::get('/reports/inbound/export', [ReportController::class, 'inboundExport']);
    Route::get('/reports/outbound', [ReportController::class, 'outbound']);
    Route::get('/reports/outbound/export', [ReportController::class, 'outboundExport']);
});
