<template>
    <div class="reviews-container">
        <h3>Opiniones de clientes</h3>
        
        <!-- Resumen de calificaciones -->
        <div class="ratings-summary" v-if="reviews.length > 0">
            <div class="average-rating">
                <span class="rating-value">{{ averageRating.toFixed(1) }}</span>
                <div class="stars">
                    <i v-for="i in 5" :key="i" 
                       :class="['fas', i <= Math.round(averageRating) ? 'fa-star' : 'fa-star-o']"></i>
                </div>
                <span class="total-reviews">{{ reviews.length }} opiniones</span>
            </div>
        </div>
        
        <!-- Lista de opiniones -->
        <div class="reviews-list">
            <div v-for="review in reviews" :key="review.id" class="review-item">
                <div class="review-header">
                    <div class="stars">
                        <i v-for="i in 5" :key="i" 
                           :class="['fas', i <= review.rating ? 'fa-star' : 'fa-star-o']"></i>
                    </div>
                    <div class="reviewer-name">{{ review.name }}</div>
                    <div class="review-date">{{ formatDate(review.created_at) }}</div>
                </div>
                <div class="review-content">{{ review.comment }}</div>
            </div>
        </div>
        
        <!-- Formulario para dejar opinión (solo para usuarios que compraron el producto) -->
        <div v-if="userPurchasedProduct && !userReviewed" class="review-form">
            <h4>Deja tu opinión</h4>
            <div class="form-group">
                <label>Calificación</label>
                <div class="rating-input">
                    <i v-for="i in 5" :key="i" 
                       :class="['fas', i <= newReview.rating ? 'fa-star' : 'fa-star-o']"
                       @click="newReview.rating = i"></i>
                </div>
            </div>
            <div class="form-group">
                <label>Comentario</label>
                <textarea v-model="newReview.comment" class="form-control" rows="3"></textarea>
            </div>
            <button @click="submitReview" class="btn btn-primary">Enviar opinión</button>
        </div>
        
        <div v-else-if="!userPurchasedProduct" class="purchase-required">
            <p>Solo los clientes que han comprado este producto pueden dejar una opinión.</p>
        </div>
        
        <div v-else-if="userReviewed" class="already-reviewed">
            <p>Ya has dejado una opinión para este producto. ¡Gracias por tu feedback!</p>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        productId: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            reviews: [],
            userPurchasedProduct: false,
            userReviewed: false,
            newReview: {
                rating: 0,
                comment: ''
            }
        };
    },
    computed: {
        averageRating() {
            if (this.reviews.length === 0) return 0;
            const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
            return sum / this.reviews.length;
        }
    },
    methods: {
        async fetchReviews() {
            try {
                // Obtener reseñas aprobadas para este producto
                const response = await this.$supabase
                    .from('reviews')
                    .select('*')
                    .eq('product_id', this.productId)
                    .eq('approved', true);
                
                this.reviews = response.data || [];
            } catch (error) {
                console.error('Error al obtener reseñas:', error);
            }
        },
        async checkUserPurchase() {
            if (!this.$auth.isAuthenticated) return;
            
            try {
                // Verificar si el usuario ha comprado este producto
                const userId = this.$auth.user.id;
                const response = await this.$supabase
                    .from('orders')
                    .select('*')
                    .eq('user_id', userId)
                    .contains('products', [this.productId]);
                
                this.userPurchasedProduct = response.data && response.data.length > 0;
                
                // Verificar si el usuario ya dejó una reseña
                if (this.userPurchasedProduct) {
                    const reviewResponse = await this.$supabase
                        .from('reviews')
                        .select('*')
                        .eq('product_id', this.productId)
                        .eq('user_id', userId);
                    
                    this.userReviewed = reviewResponse.data && reviewResponse.data.length > 0;
                }
            } catch (error) {
                console.error('Error al verificar compra:', error);
            }
        },
        async submitReview() {
            if (!this.$auth.isAuthenticated || !this.userPurchasedProduct || this.userReviewed) return;
            
            try {
                const userId = this.$auth.user.id;
                const userName = this.$auth.user.user_metadata.full_name || 'Usuario';
                
                // Enviar la reseña a Supabase
                await this.$supabase
                    .from('reviews')
                    .insert([{
                        product_id: this.productId,
                        user_id: userId,
                        name: userName,
                        rating: this.newReview.rating,
                        comment: this.newReview.comment,
                        approved: false // Requiere aprobación del administrador
                    }]);
                
                // Resetear formulario
                this.newReview = { rating: 0, comment: '' };
                this.userReviewed = true;
                
                // Mostrar mensaje de éxito
                this.$toast.success('Tu opinión ha sido enviada y está pendiente de aprobación.');
            } catch (error) {
                console.error('Error al enviar reseña:', error);
                this.$toast.error('Ocurrió un error al enviar tu opinión. Inténtalo de nuevo.');
            }
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }
    },
    mounted() {
        this.fetchReviews();
        this.checkUserPurchase();
    }
};
</script>

<style scoped>
.reviews-container {
    margin-top: 30px;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    background-color: #fff;
}

.ratings-summary {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
}

.average-rating {
    display: flex;
    align-items: center;
}

.rating-value {
    font-size: 24px;
    font-weight: bold;
    margin-right: 10px;
}

.stars {
    color: #FFD700;
    margin-right: 10px;
}

.total-reviews {
    color: #666;
    font-size: 14px;
}

.reviews-list {
    margin-bottom: 30px;
}

.review-item {
    padding: 15px 0;
    border-bottom: 1px solid #eee;
}

.review-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.reviewer-name {
    font-weight: bold;
    margin: 0 10px;
}

.review-date {
    color: #666;
    font-size: 12px;
}

.review-content {
    line-height: 1.5;
}

.review-form {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.rating-input {
    cursor: pointer;
    font-size: 24px;
    color: #FFD700;
}

.purchase-required, .already-reviewed {
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 5px;
    text-align: center;
    color: #666;
}
</style>