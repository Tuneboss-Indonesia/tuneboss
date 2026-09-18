<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            AuditLog::create([
                'action' => 'auth.login_failed',
                'entity' => 'users',
                'metadata' => ['email' => $credentials['email']],
            ]);

            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        if (! $user->is_active) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'auth.login_inactive',
                'entity' => 'users',
                'entity_id' => $user->id,
                'metadata' => ['email' => $credentials['email']],
            ]);

            throw ValidationException::withMessages([
                'email' => ['Akun ini nonaktif. Hubungi admin untuk mengaktifkan kembali.'],
            ]);
        }

        $expiresAt = $this->tokenExpiresAt();
        $token = $user->createToken('mobile-api', ['*'], $expiresAt)->plainTextToken;

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'auth.login_success',
            'entity' => 'users',
            'entity_id' => $user->id,
            'metadata' => [
                'email' => $user->email,
                'ip' => $request->ip(),
                'userAgent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'accessToken' => $token,
            'tokenType' => 'Bearer',
            'expiresAt' => $expiresAt?->toISOString(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        $request->user()->currentAccessToken()?->delete();

        $expiresAt = $this->tokenExpiresAt();
        $token = $user->createToken('mobile-api', ['*'], $expiresAt)->plainTextToken;

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'auth.token_refreshed',
            'entity' => 'users',
            'entity_id' => $user->id,
        ]);

        return response()->json([
            'accessToken' => $token,
            'tokenType' => 'Bearer',
            'expiresAt' => $expiresAt?->toISOString(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($request->user()->id)],
        ]);

        $before = $request->user()->only(['name', 'email']);
        $request->user()->update($data);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'auth.profile_updated',
            'entity' => 'users',
            'entity_id' => $request->user()->id,
            'metadata' => ['before' => $before, 'after' => $request->user()->only(['name', 'email'])],
        ]);

        return new UserResource($request->user()->refresh());
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'currentPassword' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if (! Hash::check($data['currentPassword'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'currentPassword' => ['Password saat ini tidak sesuai.'],
            ]);
        }

        $request->user()->update(['password' => $data['password']]);
        $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'auth.password_updated',
            'entity' => 'users',
            'entity_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Password diperbarui.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'auth.logout_all',
            'entity' => 'users',
            'entity_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Logged out from all devices']);
    }

    private function tokenExpiresAt()
    {
        $minutes = config('sanctum.expiration');

        return $minutes ? now()->addMinutes((int) $minutes) : null;
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
