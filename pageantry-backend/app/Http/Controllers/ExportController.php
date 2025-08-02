<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use App\Models\Score;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class ExportController extends Controller
{
    /**
     * Export results as Excel
     */
    public function exportExcel(Request $request)
    {
        $filter = $request->get('filter', 'overall');
        
        return Excel::download(new ResultsExport($filter), 'pageant-results.xlsx');
    }

    /**
     * Export results as PDF
     */
    public function exportPdf(Request $request)
    {
        $filter = $request->get('filter', 'overall');
        $data = $this->getResultsData($filter);

        $pdf = Pdf::loadView('exports.results-pdf', $data);
        
        return $pdf->download('pageant-results.pdf');
    }

    /**
     * Get results data based on filter
     */
    private function getResultsData(string $filter): array
    {
        $candidates = Candidate::where('is_active', true)->get();

        switch ($filter) {
            case 'top_gown':
                $results = $candidates->map(function ($candidate) {
                    return [
                        'candidate' => $candidate,
                        'score' => $candidate->getAverageScore('gown')
                    ];
                })->sortByDesc('score')->values();
                $title = 'Top Gown Results';
                break;

            case 'top_swimsuit':
                $results = $candidates->map(function ($candidate) {
                    return [
                        'candidate' => $candidate,
                        'score' => $candidate->getAverageScore('swimsuit')
                    ];
                })->sortByDesc('score')->values();
                $title = 'Top Swimsuit Results';
                break;

            case 'top_qa':
                $results = $candidates->map(function ($candidate) {
                    return [
                        'candidate' => $candidate,
                        'score' => $candidate->getAverageScore('qa')
                    ];
                })->sortByDesc('score')->values();
                $title = 'Top Q&A Results';
                break;

            case 'top_sports_attire':
                $results = $candidates->map(function ($candidate) {
                    return [
                        'candidate' => $candidate,
                        'score' => $candidate->getAverageScore('sports_attire')
                    ];
                })->sortByDesc('score')->values();
                $title = 'Top Sports Attire Results';
                break;

            default: // overall
                $results = $candidates->map(function ($candidate) {
                    $breakdown = $candidate->getScoresBreakdown();
                    return [
                        'candidate' => $candidate,
                        'sports_attire' => $breakdown['sports_attire'],
                        'swimsuit' => $breakdown['swimsuit'],
                        'gown' => $breakdown['gown'],
                        'qa' => $breakdown['qa'],
                        'total' => $breakdown['total']
                    ];
                })->sortByDesc('total')->values();
                $title = 'Overall Results';
                break;
        }

        return [
            'title' => $title,
            'filter' => $filter,
            'results' => $results,
            'generated_at' => now()->format('Y-m-d H:i:s')
        ];
    }
}

// Excel Export Class
class ResultsExport implements \Maatwebsite\Excel\Concerns\FromCollection, 
                              \Maatwebsite\Excel\Concerns\WithHeadings,
                              \Maatwebsite\Excel\Concerns\WithStyles,
                              \Maatwebsite\Excel\Concerns\WithTitle
{
    private string $filter;

    public function __construct(string $filter)
    {
        $this->filter = $filter;
    }

    public function collection()
    {
        $candidates = Candidate::where('is_active', true)->get();

        switch ($this->filter) {
            case 'top_gown':
                return $candidates->map(function ($candidate, $index) {
                    return [
                        'rank' => $index + 1,
                        'candidate_number' => $candidate->candidate_number,
                        'name' => $candidate->name,
                        'gown_score' => number_format($candidate->getAverageScore('gown'), 2)
                    ];
                })->sortByDesc('gown_score')->values();

            case 'top_swimsuit':
                return $candidates->map(function ($candidate, $index) {
                    return [
                        'rank' => $index + 1,
                        'candidate_number' => $candidate->candidate_number,
                        'name' => $candidate->name,
                        'swimsuit_score' => number_format($candidate->getAverageScore('swimsuit'), 2)
                    ];
                })->sortByDesc('swimsuit_score')->values();

            case 'top_qa':
                return $candidates->map(function ($candidate, $index) {
                    return [
                        'rank' => $index + 1,
                        'candidate_number' => $candidate->candidate_number,
                        'name' => $candidate->name,
                        'qa_score' => number_format($candidate->getAverageScore('qa'), 2)
                    ];
                })->sortByDesc('qa_score')->values();

            case 'top_sports_attire':
                return $candidates->map(function ($candidate, $index) {
                    return [
                        'rank' => $index + 1,
                        'candidate_number' => $candidate->candidate_number,
                        'name' => $candidate->name,
                        'sports_attire_score' => number_format($candidate->getAverageScore('sports_attire'), 2)
                    ];
                })->sortByDesc('sports_attire_score')->values();

            default: // overall
                return $candidates->map(function ($candidate, $index) {
                    $breakdown = $candidate->getScoresBreakdown();
                    return [
                        'rank' => $index + 1,
                        'candidate_number' => $candidate->candidate_number,
                        'name' => $candidate->name,
                        'sports_attire' => number_format($breakdown['sports_attire'], 2),
                        'swimsuit' => number_format($breakdown['swimsuit'], 2),
                        'gown' => number_format($breakdown['gown'], 2),
                        'qa' => number_format($breakdown['qa'], 2),
                        'total' => number_format($breakdown['total'], 2)
                    ];
                })->sortByDesc('total')->values();
        }
    }

    public function headings(): array
    {
        switch ($this->filter) {
            case 'top_gown':
                return ['Rank', 'Candidate #', 'Name', 'Gown Score'];
            case 'top_swimsuit':
                return ['Rank', 'Candidate #', 'Name', 'Swimsuit Score'];
            case 'top_qa':
                return ['Rank', 'Candidate #', 'Name', 'Q&A Score'];
            case 'top_sports_attire':
                return ['Rank', 'Candidate #', 'Name', 'Sports Attire Score'];
            default:
                return ['Rank', 'Candidate #', 'Name', 'Sports Attire (20%)', 'Swimsuit (20%)', 'Gown (30%)', 'Q&A (30%)', 'Total'];
        }
    }

    public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function title(): string
    {
        return 'Pageant Results';
    }
}

