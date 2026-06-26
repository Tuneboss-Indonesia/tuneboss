<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('customer_name', 180)->nullable()->after('party');
            $table->enum('payment_status', ['Lunas', 'DP', 'Unpaid', 'PayLater'])->nullable()->after('customer_name');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn(['customer_name', 'payment_status']);
        });
    }
};
