<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductSerial;
use Illuminate\Database\Seeder;

class TuneBossSerialSeeder extends Seeder
{
    public function run(): void
    {
        $serialsBySku = [
            'TB-YMH-MX-KING-V1' => ['TCYA009A0021', 'TCYA009A0022', 'TCYA009A0023', 'TCYA009A0024', 'TCYA009A0025'],
            'TB-YMH-MX-KING-V2' => ['TCYA016A0086', 'TCYA016A0087', 'TCYA016A0098', 'TCYA016A0092', 'TCYA016A0105'],
            'TB-YMH-XMAX-V1' => ['TDYA019A0061'],
            'TB-YMH-XMAX-V2' => ['TDYA020A0147'],
            'TB-YMH-WR-155-V2' => ['TDYA022A0024', 'TDYA022A0036'],
            'TB-YMH-R15M' => ['TCYA021A0001'],
            'TB-HND-SONIC-150' => ['TCHN003A0068', 'TCHN003A0064'],
            'TB-HND-CRF-150L-K84-F' => ['TCHN010A0003', 'TCHN010A0004'],
        ];

        foreach ($serialsBySku as $sku => $serialNumbers) {
            $product = Product::where('sku', $sku)->first();

            if (! $product) {
                continue;
            }

            foreach ($serialNumbers as $serialNumber) {
                ProductSerial::firstOrCreate([
                    'serial_number' => $serialNumber,
                ], [
                    'product_id' => $product->id,
                    'status' => 'in_stock',
                ]);
            }

            $availableSerials = ProductSerial::where('product_id', $product->id)->where('status', 'in_stock')->count();
            $stock = $product->stock()->firstOrCreate(['product_id' => $product->id], ['quantity' => 0]);

            if ($stock->quantity < $availableSerials) {
                $stock->update(['quantity' => $availableSerials]);
            }
        }
    }
}
