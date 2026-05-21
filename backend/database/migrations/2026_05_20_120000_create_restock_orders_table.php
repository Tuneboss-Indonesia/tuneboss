<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restock_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('restock_alert_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['draft', 'ordered', 'received', 'cancelled'])->default('draft')->index();
            $table->unsignedInteger('quantity');
            $table->text('note')->nullable();
            $table->timestamp('ordered_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restock_orders');
    }
};
