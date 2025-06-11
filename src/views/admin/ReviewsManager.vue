<template>
    <div class="reviews-manager">
        <h2>Gestión de Opiniones</h2>
        
        <div class="filters">
            <div class="form-group">
                <label>Filtrar por estado</label>
                <select v-model="filter" class="form-control">
                    <option value="pending">Pendientes de aprobación</option>
                    <option value="approved">Aprobadas</option>
                    <option value="all">Todas</option>
                </select>
            </div>
        </div>
        
        <div class="reviews-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Usuario</th>
                        <th>Calificación</th>
                        <th>Comentario</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="review in filteredReviews" :key="review.id">
                        <td>{{ getProductName(review.product_id) }}</td>
                        <td>{{ review.name }}</td>
                        <td>
                            <div class="stars">
                                <i v-for="i in 5" :key="i" 
                                   :class="['fas', i <= review.rating ? 'fa-star' : 'fa-star-o']"></i>
                            </div>
                        </td>
                        <td>{{ review.comment }}</td>
                        <td>{{ formatDate(review.created_at) }}</td>
                        <td>
                            <span :class="['badge', review.approved ? 'badge-success' : 'badge-warning']">
                                {{ review.approved ? 'Aprobada' : 'Pendiente' }}
                            </span>
                        </td>
                        <td>
                            <button v-if="!review.approved" 
                                    @click="approveReview(review.id)" 
                                    class="btn btn-sm btn-success">
                                Aprobar
                            </button>
                            <button v-if="review.approved" 
                                    @click="rejectReview(review.id)" 
                                    class="btn btn-sm btn-warning">
                                Rechazar
                            </button>
                            <button @click="deleteReview(review.id)" 
                                    class="btn btn-sm btn-danger ml-2">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="create-review-section">
            <h3>Crear Opinión de Prueba</h3>
            <div class="form-group">
                <label>Producto</label>
                <select v-model="newReview.product_id" class="form-control">
                    <option v-for="product in products" :key="product.id" :value="product.id">
                        {{ product.name }}
                    </option>
                </select>
            </div>
            <div class="form-group">
                <label>Nombre del Usuario</label>
                <input type="text" v-model="newReview.name" class="form-control" />
            </div>
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
            <button @click="createReview" class="btn btn-primary">Crear Opinión</button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            reviews: [],
            products: [],
            filter: 'pending',
            newReview: {
                product_id: '',
                name: '',
                rating: 5,
                comment: '',
                approved: true
            }
        };
    },
    computed: {
        filteredReviews() {
            if (this.filter === 'all') return this.reviews;
            return this.reviews.filter(review => 
                this.filter === 'approved' ? review.approved : !review.approved
            );
        }
    },
    methods: {
        async fetchReviews() {
            try {
                const response = await this.$supabase
                    .from('reviews')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                this.reviews = response.data || [];
            } catch (error) {
                console.error('Error al obtener reseñas:', error);
                this.$toast.error('Error al cargar las reseñas');
            }
        },
        async fetchProducts() {
            try {
                const response = await this.$supabase
                    .from('products')
                    .select('id, name');
                
                this.products = response.data || [];
                
                if (this.products.length > 0) {
                    this.newReview.product_id = this.products[0].id;
                }
            } catch (error) {
                console.error('Error al obtener productos:', error);
                this.$toast.error('Error al cargar los productos');
            }
        },
        getProductName(productId) {
            const product = this.products.find(p => p.id === productId);
            return product ? product.name : 'Producto desconocido';
        },
        async approveReview(reviewId) {
            try {
                await this.$supabase
                    .from('reviews')
                    .update({ approved: true })
                    .eq('id', reviewId);
                
                // Actualizar localmente
                const index = this.reviews.findIndex(r => r.id === reviewId);
                if (index !== -1) {
                    this.reviews[index].approved = true;
                }
                
                this.$toast.success('Reseña aprobada correctamente');
            } catch (error) {
                console.error('Error al aprobar reseña:', error);
                this.$toast.error('Error al aprobar la reseña');
            }
        },
        async rejectReview(reviewId) {
            try {
                await this.$supabase
                    .from('reviews')
                    .update({ approved: false })
                    .eq('id', reviewId);
                
                // Actualizar localmente
                const index = this.reviews.findIndex(r => r.id === reviewId);
                if (index !== -1) {
                    this.reviews[index].approved = false;
                }
                
                this.$toast.success('Reseña rechazada correctamente');
            } catch (error) {
                console.error('Error al rechazar reseña:', error);
                this.$toast.error('Error al rechazar la reseña');
            }
        },
        async deleteReview(reviewId) {
            if (!confirm('¿Estás seguro de que deseas eliminar esta reseña?')) return;
            
            try {
                await this.$supabase
                    .from('reviews')
                    .delete()
                    .eq('id', reviewId);
                
                // Actualizar localmente
                this.reviews = this.reviews.filter(r => r.id !== reviewId);
                
                this.$toast.success('Reseña eliminada correctamente');
            } catch (error) {
                console.error('Error al eliminar reseña:', error);
                this.$toast.error('Error al eliminar la reseña');
            }
        },
        async createReview() {
            try {
                const { data, error } = await this.$supabase
                    .from('reviews')
                    .insert([{
                        product_id: this.newReview.product_id,
                        name: this.newReview.name,
                        rating: this.newReview.rating,
                        comment: this.newReview.comment,
                        approved: this.newReview.approved,
                        user_id: 'admin' // Marcamos como creada por el administrador
                    }]);
                
                if (error) throw error;
                
                // Actualizar la lista
                this.fetchReviews();
                
                // Resetear formulario
                this.newReview = {
                    product_id: this.products.length > 0 ? this.products[0].id : '',
                    name: '',
                    rating: 5,
                    comment: '',
                    approved: true
                };
                
                this.$toast.success('Reseña de prueba creada correctamente');
            } catch (error) {
                console.error('Error al crear reseña:', error);
                this.$toast.error('Error al crear la reseña de prueba');
            }
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }
    },
    mounted() {
        this.fetchProducts();
        this.fetchReviews();
    }
};
</script>

<style scoped>
.reviews-manager {
    padding: 20px;
}

.filters {
    margin-bottom: 20px;
}

.reviews-table {
    margin-bottom: 30px;
}

.stars {
    color: #FFD700;
}

.rating-input {
    cursor: pointer;
    font-size: 24px;
    color: #FFD700;
}

.create-review-section {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.badge {
    padding: 5px 10px;
    border-radius: 3px;
    font-weight: normal;
}

.badge-success {
    background-color: #28a745;
    color: white;
}

.badge-warning {
    background-color: #ffc107;
    color: #212529;
}
</style>