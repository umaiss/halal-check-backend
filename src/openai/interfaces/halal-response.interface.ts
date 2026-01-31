export interface IngredientAnalysis {
    component_name: string;
    component_type: 'INGREDIENT' | 'E_CODE' | 'CHEMICAL_ADDITIVE';
    status: 'HALAL' | 'HARAM' | 'MUSBOOH';
    note: string;
}

export interface HalalCheckResponse {
    overall_status: 'HALAL' | 'HARAM' | 'MUSBOOH';
    reasoning: string;
    ingredients_analysis: IngredientAnalysis[];
}
