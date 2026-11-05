<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->nullable()->constrained('internship_assignments')->cascadeOnDelete();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('agenda')->nullable();
            $table->date('scheduled_on');
            $table->time('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes')->default(30);
            $table->string('location')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('outcome')->nullable();
            $table->timestamps();

            $table->index(['student_user_id', 'scheduled_on']);
            $table->index(['host_user_id', 'scheduled_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};
