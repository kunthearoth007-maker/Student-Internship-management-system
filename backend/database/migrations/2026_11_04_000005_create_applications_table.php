<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('internship_id')->constrained()->cascadeOnDelete();
            $table->text('cover_letter')->nullable();
            $table->string('cv')->nullable();
            $table->enum('status', ['pending', 'reviewing', 'accepted', 'rejected', 'cancelled'])->default('pending')->index();
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'internship_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
