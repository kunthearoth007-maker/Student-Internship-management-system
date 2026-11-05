<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('internship_assignments')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->enum('evaluator_type', ['company', 'supervisor']);
            $table->unsignedTinyInteger('technical_score');
            $table->unsignedTinyInteger('communication_score');
            $table->unsignedTinyInteger('teamwork_score');
            $table->unsignedTinyInteger('attendance_score');
            $table->unsignedTinyInteger('professionalism_score');
            $table->decimal('overall_score', 3, 1);
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique(['assignment_id', 'evaluator_id', 'evaluator_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
