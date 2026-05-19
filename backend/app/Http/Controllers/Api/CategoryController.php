<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\AuditLog;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index()
    {
        return CategoryResource::collection(Category::withCount('products')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:categories,name'],
            'description' => ['nullable', 'string'],
        ]);

        $category = Category::create($data);
        $this->audit($request, 'category.created', $category);

        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    public function show(Category $category)
    {
        return new CategoryResource($category->loadCount('products'));
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('categories', 'name')->ignore($category->id)],
            'description' => ['nullable', 'string'],
        ]);

        $category->update($data);
        $this->audit($request, 'category.updated', $category);

        return new CategoryResource($category);
    }

    public function destroy(Request $request, Category $category)
    {
        if ($category->products()->exists()) {
            return response()->json(['message' => 'Kategori masih dipakai produk.'], 422);
        }

        $category->delete();
        $this->audit($request, 'category.deleted', $category);

        return response()->json(['message' => 'Kategori dihapus.']);
    }

    private function audit(Request $request, string $action, Category $category): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'categories',
            'entity_id' => $category->id,
        ]);
    }
}
