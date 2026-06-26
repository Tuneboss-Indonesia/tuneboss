<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class TuneBossProductSeeder extends Seeder
{
    public function run(): void
    {
        $brands = ['Yamaha', 'Honda', 'Suzuki', 'Kawasaki'];

        $categories = collect($brands)->mapWithKeys(fn (string $brand) => [
            $brand => Category::updateOrCreate(
                ['name' => $brand],
                ['description' => 'Produk ECU TuneBoss untuk motor '.$brand]
            ),
        ]);

        $products = [
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-XMAX-V1', 'name' => 'XMAX V1'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-XMAX-V2', 'name' => 'XMAX V2'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-XMAX-V3', 'name' => 'XMAX V3'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-NMAX-V1', 'name' => 'NMAX V1'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-XSR-V1', 'name' => 'XSR V1'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-XSR-V2', 'name' => 'XSR V2'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-R15M', 'name' => 'R15M'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-R15-V3', 'name' => 'R15 V3'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-R25-OLD', 'name' => 'R25 OLD'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-R25-ABS', 'name' => 'R25 ABS'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-R25-V2', 'name' => 'R25 V2'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-R25-V3', 'name' => 'R25 V3'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-MT15-V2', 'name' => 'MT15 V2'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-MT25-ABS', 'name' => 'MT25 ABS'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-WR-155-V1', 'name' => 'WR 155 V1'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-WR-155-V2', 'name' => 'WR 155 V2'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-MX-KING-V1', 'name' => 'MX KING V1'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-MX-KING-V2', 'name' => 'MX KING V2'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-CDI-NJMX-135', 'name' => 'CDI NJMX 135'],
            ['brand' => 'Yamaha', 'sku' => 'TB-YMH-CDI-JUPITER-MX', 'name' => 'CDI JUPITER MX'],

            ['brand' => 'Honda', 'sku' => 'TB-HND-SUPRA-GTR-150-OLD', 'name' => 'SUPRA GTR 150 OLD'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-SUPRA-GTR-150-NEW', 'name' => 'SUPRA GTR 150 NEW'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-SONIC-150', 'name' => 'SONIC 150'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CB-150-VERZA-CHIP', 'name' => 'CB 150 VERZA (CHIP)'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CB-150X-CHIP', 'name' => 'CB 150X (CHIP)', 'barcode' => 'TDYA020A0092'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CB-150R-CHIP', 'name' => 'CB 150R (CHIP)'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CBR-150R-OLD', 'name' => 'CBR150R OLD'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CBR-150R-K45G', 'name' => 'CBR150R K45G'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CBR-150R-K45N', 'name' => 'CBR150R K45N'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CBR-150R-K45R', 'name' => 'CBR150R K45R'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CBR-150R-CBU', 'name' => 'CBR150R CBU'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CBR-250R-CBU', 'name' => 'CBR 250R CBU'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-NEW-CB-150-V1', 'name' => 'NEW CB 150 V1'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-NEW-CB-150-V2', 'name' => 'NEW CB 150 V2'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-NEW-CB-150-V3', 'name' => 'NEW CB 150 V3'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CRF-150L-K84-F', 'name' => 'CRF 150L K84/F'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-CRF-250-RALLY', 'name' => 'CRF 250 RALLY'],
            ['brand' => 'Honda', 'sku' => 'TB-HND-FORZA-250', 'name' => 'FORZA 250'],

            ['brand' => 'Suzuki', 'sku' => 'TB-SZK-SATRIA-FU-FI', 'name' => 'SATRIA FU FI'],
            ['brand' => 'Suzuki', 'sku' => 'TB-SZK-GSX-150', 'name' => 'GSX 150'],
            ['brand' => 'Suzuki', 'sku' => 'TB-SZK-GSX-250R', 'name' => 'GSX 250R'],
            ['brand' => 'Suzuki', 'sku' => 'TB-SZK-VSTOM-250', 'name' => 'VSTOM 250'],

            ['brand' => 'Kawasaki', 'sku' => 'TB-KWS-NINJA-MONO-250', 'name' => 'NINJA MONO 250'],
            ['brand' => 'Kawasaki', 'sku' => 'TB-KWS-CDI-KLX-150', 'name' => 'CDI KLX 150'],
        ];

        $activeSkus = collect($products)->pluck('sku')->all();

        Product::whereNotIn('sku', $activeSkus)->update(['is_active' => false]);

        foreach ($products as $item) {
            $product = Product::updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'category_id' => $categories[$item['brand']]->id,
                    'name' => $item['name'],
                    'barcode' => $item['barcode'] ?? null,
                    'min_stock' => 1,
                    'is_active' => true,
                ]
            );

            $product->stock()->firstOrCreate(
                ['product_id' => $product->id],
                ['quantity' => 0]
            );
        }
    }
}
