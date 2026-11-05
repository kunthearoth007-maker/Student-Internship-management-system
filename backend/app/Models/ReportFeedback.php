<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportFeedback extends Model
{
    protected $table = 'report_feedback';

    protected $fillable = ['report_id', 'supervisor_id', 'feedback'];

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function supervisor()
    {
        return $this->belongsTo(Supervisor::class);
    }
}
