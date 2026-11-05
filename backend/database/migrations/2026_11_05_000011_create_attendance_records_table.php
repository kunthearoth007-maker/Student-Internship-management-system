<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('internship_assignments')->cascadeOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('recorded_on');
            $table->string('status')->default('present');
            $table->decimal('hours', 4, 1)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['assignment_id', 'recorded_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
