<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_serials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->string('serial_number', 120)->unique();
            $table->enum('status', ['in_stock', 'out'])->default('in_stock')->index();
            $table->timestamps();

            $table->index(['product_id', 'status']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->json('serial_numbers')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn('serial_numbers');
        });

        Schema::dropIfExists('product_serials');
    }
};
