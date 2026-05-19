<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserCollection;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->query('search'), function ($query, string $search) {
                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->query('role'), fn ($query, string $role) => $query->where('role', $role))
            ->when($request->query('active') !== null, fn ($query) => $query->where('is_active', filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return new UserCollection($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'staff'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user = User::create($data);
        $this->audit($request, 'user.created', $user);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function show(User $user)
    {
        return new UserResource($user);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in(['admin', 'staff'])],
            'is_active' => ['required', 'boolean'],
        ]);

        $user->update($data);
        $this->audit($request, 'user.updated', $user);

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return new UserResource($user);
    }

    public function updatePassword(Request $request, User $user)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();
        $this->audit($request, 'user.password_updated', $user);

        return response()->json(['message' => 'Password user diperbarui.']);
    }

    public function deactivate(Request $request, User $user)
    {
        if ($request->user()->is($user)) {
            return response()->json(['message' => 'Admin tidak bisa menonaktifkan akun sendiri.'], 422);
        }

        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        $this->audit($request, 'user.deactivated', $user);

        return response()->json(['message' => 'User dinonaktifkan.']);
    }

    private function audit(Request $request, string $action, User $user): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'users',
            'entity_id' => $user->id,
        ]);
    }
}
