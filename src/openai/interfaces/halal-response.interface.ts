export interface IngredientAnalysis {
    component_name: string;
    component_type: 'INGREDIENT' | 'E_CODE' | 'CHEMICAL_ADDITIVE';
    status: 'HALAL' | 'HARAM' | 'MUSBOOH';
    note: string;
}

export interface HalalCheckResponse {
    id?: number;
    overall_status: 'HALAL' | 'HARAM' | 'MUSBOOH';
    reasoning: string;
    ingredients_analysis: IngredientAnalysis[];
    front_image?: string;
    back_image?: string;
    ingredients_image?: string;
    product_name?: string;
    barcode_image?: string;
    manufacturer_image?: string;
    additional_images?: string[];
}
