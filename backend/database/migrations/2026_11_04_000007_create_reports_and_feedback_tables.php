<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('internship_assignments')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('report_type', ['weekly', 'monthly', 'final']);
            $table->string('file')->nullable();
            $table->enum('status', ['submitted', 'approved', 'revision_required'])->default('submitted')->index();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('report_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supervisor_id')->constrained()->cascadeOnDelete();
            $table->text('feedback');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_feedback');
        Schema::dropIfExists('reports');
    }
};
