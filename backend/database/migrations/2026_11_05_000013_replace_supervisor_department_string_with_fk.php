<?php

use App\Models\Department;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('supervisors')->whereNotNull('department')->where('department', '!=', '')
            ->orderBy('id')->get(['id', 'department'])
            ->each(function ($row) {
                $department = Department::firstOrCreate(
                    ['name' => $row->department],
                    ['is_active' => true]
                );

                DB::table('supervisors')->where('id', $row->id)->update(['department_id' => $department->id]);
            });

        Schema::table('supervisors', function (Blueprint $table) {
            $table->dropColumn('department');
        });
    }

    public function down(): void
    {
        Schema::table('supervisors', function (Blueprint $table) {
            $table->string('department')->nullable();
        });

        DB::table('supervisors')->join('departments', 'departments.id', '=', 'supervisors.department_id')
            ->select('supervisors.id', 'departments.name')
            ->each(fn ($row) => DB::table('supervisors')->where('id', $row->id)->update(['department' => $row->name]));
    }
};
