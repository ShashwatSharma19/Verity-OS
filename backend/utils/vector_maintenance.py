import lancedb
from datetime import timedelta

def connect_to_db(uri: str = "data/lancedb"):
    return lancedb.connect(uri)

def optimize_vector_db(table_name: str, connection_uri: str = "data/lancedb"):
    try:
        db = connect_to_db(connection_uri)
        table = db.open_table(table_name)
        
        table.compact_files()
        table.cleanup_old_versions(older_than=timedelta(days=7)) 
        return True
    except Exception as e:
        return False