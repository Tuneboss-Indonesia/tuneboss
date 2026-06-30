<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('customer_phone', 40)->nullable()->after('customer_name');
            $table->string('payment_method', 80)->nullable()->after('payment_status');
            $table->decimal('nominal_amount', 14, 2)->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn(['customer_phone', 'payment_method', 'nominal_amount']);
        });
    }
};
