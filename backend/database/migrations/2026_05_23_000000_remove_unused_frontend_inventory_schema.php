<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('restock_orders');

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
            $table->dropConstrainedForeignId('supplier_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
            $table->dropColumn('total_amount');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['price', 'subtotal']);
        });

        Schema::dropIfExists('customers');
        Schema::dropIfExists('suppliers');
    }

    public function down(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('price', 14, 2)->default(0)->after('quantity');
            $table->decimal('subtotal', 14, 2)->default(0)->after('price');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignUuid('customer_id')->nullable()->after('cashier_id')->constrained()->nullOnDelete();
            $table->decimal('total_amount', 14, 2)->default(0)->after('address');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignUuid('supplier_id')->nullable()->after('party')->constrained()->nullOnDelete();
            $table->foreignUuid('customer_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });

        Schema::create('restock_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('restock_alert_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('ordered');
            $table->integer('quantity');
            $table->text('note')->nullable();
            $table->timestamp('ordered_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();
        });
    }
};
