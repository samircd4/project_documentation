import React from 'react'
import styles from './card.css';

const Card = () => {
    return (
        <div>
            <div className="card">
                <img width={260} height={300}
                src="https://via.placeholder.com/150"
                alt="Placeholder"
                className="card-img-top"
                />
                <div className="card-body">
                <h5 className="card-title">Card title</h5>
                <p className="card-text">
                    Some quick example text to build on the card title and make up the bulk
                    of the card's content.
                </p>
                <a href="#" className="btn btn-primary">
                    Go somewhere
                </a>
                </div>
            </div>
        </div>
    )
}

export default Card
