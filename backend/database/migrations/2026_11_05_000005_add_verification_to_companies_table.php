<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('verification_status')->default('unverified');
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_note')->nullable();
        });

        DB::table('companies')->whereNull('verified_at')->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['verification_status', 'verified_at', 'verification_note']);
        });
    }
};
