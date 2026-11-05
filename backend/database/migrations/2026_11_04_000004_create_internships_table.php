<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('internships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('category')->index();
            $table->text('description');
            $table->text('requirements');
            $table->string('location')->index();
            $table->string('internship_type')->default('full_time');
            $table->unsignedInteger('positions')->default(1);
            $table->date('start_date');
            $table->date('end_date');
            $table->date('application_deadline');
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internships');
    }
};
