<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
            $table->timestamp('offered_at')->nullable();
            $table->timestamp('offer_deadline')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->text('offer_note')->nullable();
        });

        DB::table('applications')->where('status', 'accepted')->update(['offered_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn(['offered_at', 'offer_deadline', 'responded_at', 'offer_note']);
            $table->enum('status', ['pending', 'reviewing', 'accepted', 'rejected', 'cancelled'])->default('pending')->change();
        });
    }
};
